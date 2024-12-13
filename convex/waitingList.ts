import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { internal } from "./_generated/api";

export const getQueuePosition = query({
  args: {
    eventId: v.id('events'),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    // GET ENTRY FOR THIS SPECIFIC USER AND EVENT COMBINATION
    const entry = await ctx.db
      .query('waitingList')
      .withIndex('by_user_event', (q) => q.eq('userId', userId).eq('eventId', eventId))
      .filter((q) => q.neq(q.field('status'), WAITING_LIST_STATUS.EXPIRED))
      .first();

    if (!entry) return null;

    // GET TOTAL NUMBER OF PEOPLE AHEAD IN LINE
    const peopleAhead = await ctx.db
      .query('waitingList')
      .withIndex('by_event_status', (q) => q.eq('eventId', eventId))
      .filter((q) =>
        q.and(
          // GET ALL ENTRIES BEFORE THIS ONE
          q.lt(q.field('_creationTime'), entry._creationTime),
          q.or(
            q.eq(q.field('status'), WAITING_LIST_STATUS.WAITING),
            q.eq(q.field('status'), WAITING_LIST_STATUS.OFFERED)
          )
        )
      )
      .collect()
      .then((entries) => entries.length);

    return {
      ...entry,
      position: peopleAhead + 1,
    }
  },
})

export const expireOffer = internalMutation({
  args: {
    waitingListId: v.id('waitingList'),
    eventId: v.id('events'),
  },
  handler: async (ctx, { waitingListId, eventId }) => {
    const offer = await ctx.db.get(waitingListId);

    // IF OFFER IS NOT FOUND OR IS NOT IN OFFERED STATUS, DO NOTHING
    if (!offer || offer.status !== WAITING_LIST_STATUS.OFFERED) return;

    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.EXPIRED,
    });

    await processQueue(ctx, { eventId });
  },
});

// MUTATION TO PROCESS THE WAITING LIST QUEUE AND OFFER TICKETS TO NEXT ELIGIBLE USERS.
// CHECKS CURRENT AVAILABILITY CONSIDERING PURCHASED TICKETS AND ACTIVE OFFERS.
export const processQueue = mutation({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);

    if (!event) throw new Error('Event not found');

    const { availableSpots } = await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('_id'), eventId))
      .first()
      .then(async (event) => {
        if (!event) throw new Error('Event not found');

        const purchaseCount = await ctx.db
          .query('tickets')
          .withIndex('by_events', (q) => q.eq('eventId', eventId))
          .collect()
          .then(
            (tickets) =>
              tickets.filter(
                (t) =>
                  t.status === TICKET_STATUS.VALID ||
                  t.status === TICKET_STATUS.USED
              ).length
          );

        const now = Date.now();
        const activeOffers = await ctx.db
          .query('waitingList')
          .withIndex('by_event_status', (q) => q.eq('eventId', eventId).eq('status', WAITING_LIST_STATUS.OFFERED))
          .filter((q) => q.lt(q.field('offerExpiresAt'), now))
          .collect()
          .then(
            (entries) =>
              entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
          );

        return {
          availableSpots: event.totalTickets - (purchaseCount + activeOffers),
        };
      });

    if (availableSpots <= 0) return;

    // GET NEXT USER IN LINE
    const waitingUsers = await ctx.db
      .query('waitingList')
      .withIndex('by_event_status', (q) => q.eq('eventId', eventId).eq('status', WAITING_LIST_STATUS.WAITING))
      .order('asc')
      .take(availableSpots)

    // CREATE TIME-LIMITED OFFERES FOR SELECTED USERS
    const now = Date.now();

    for (const user of waitingUsers) {
      // UPDATE THE WAITING LIST ENTRY TO OFFERED STATUS
      await ctx.db.patch(user._id, {
        status: WAITING_LIST_STATUS.OFFERED,
        offerExpiresAt: now + DURATIONS.TICKET_OFFER,
      });

      // SCHEDULE EXPIRATION JOB FOR THIS OFFER
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER, // THE DURATION UNTIL THE SCHEDULE JOB RUNS
        internal.waitingList.expireOffer,
        {
          waitingListId: user._id,
          eventId,
        }
      );
    }
  },
})

export const releaseTicket = mutation({
  args: {
    eventId: v.id('events'),
    waitingListId: v.id('waitingList'),
  },
  handler: async (ctx, { eventId, waitingListId }) => {
    const entry = await ctx.db.get(waitingListId);

    if (!entry || entry.status !== WAITING_LIST_STATUS.OFFERED) {
      throw new Error('No valid ticket offer found');
    }

    // MARK THE ENTRY AS EXPIRED
    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.EXPIRED,
    })

    // TODO: PROCESS QUEUE TO OFFER TICKET TO NEXT PERSON
    await processQueue(ctx, { eventId });
  }
})