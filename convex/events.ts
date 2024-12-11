import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { internal } from "./_generated/api";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('is_cancelled'), undefined))
      .collect();
  },
})

export const getById = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
    return await ctx.db.get(eventId);
  },
})

export const getEventAvailability = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);

    if (!event) throw new Error('Event not found');

    // COUNT TOTAL PURCHASED TICKETS
    const purchasedCount = await ctx.db
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

    // COUNT CURRENT VALID OFFERS
    const now = Date.now();
    const activeOffers = await ctx.db
      .query('waitingList')
      .withIndex('by_event_status', (q) => q.eq('eventId', eventId).eq('status', WAITING_LIST_STATUS.OFFERED))
      .collect()
      .then(
        (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
      );

    const totalReserved = purchasedCount + activeOffers;

    return {
      isSoldOut: totalReserved >= event.totalTickets,
      totalTickets: event.totalTickets,
      purchasedCount,
      activeOffers,
      remainingTickets: Math.max(0, event.totalTickets - totalReserved),
    }
  },
})

// PRETTY MUCH A DIPLICATE OF getEventAvailability
export const checkAvailability = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);

    if (!event) throw new Error('Event not found');

    // COUNT THE TOTAL PURCHASED TICKETS
    const purchasedCount = await ctx.db
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

    // COUNT CURRENT VALID OFFERS
    const now = Date.now();
    const activeOffers = await ctx.db
      .query('waitingList')
      .withIndex('by_event_status', (q) => q.eq('eventId', eventId).eq('status', WAITING_LIST_STATUS.OFFERED))
      .collect()
      .then(
        (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
      );

    const availableSpots = event.totalTickets - (purchasedCount + activeOffers);

    return {
      available: availableSpots > 0,
      availableSpots,
      totalTickets: event.totalTickets,
      purchasedCount,
      activeOffers
    }
  },
})

export const joinWaitingList = mutation({
  args: {
    eventId: v.id('events'),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    // RATE LIMIT CHECK
    // const status = await rateLimiter.limit(ctx, 'queueJoin', {key: userId});

    // if (!status.ok) {
    //   throw new ConvexError(`You've joined the waiting list too many times. Please wait ${Math.cell(status.retryAfter / (60 * 1000))} minutes before trying again.`); 
    // }

    // FIRST CHECK IF USER ALREADY HAS AN ACTIVE ENTRY IN WAITING LIST FOR THIS EVENT
    // ACTIVE MEANS ANY STATUS EXCEPT EXPIRED
    const existingEntry = await ctx.db
      .query('waitingList')
      .withIndex('by_user_event', (q) => q.eq('userId', userId).eq('eventId', eventId))
      .filter((q) => q.neq(q.field('status'), WAITING_LIST_STATUS.EXPIRED))
      .first()

    // DONT ALLOW DUPLICATE ENTRIES
    if (existingEntry) {
      throw new Error('You already have an active entry in the waiting list for this event.');
    }

    // VERIFY THE EVENT EXISTS
    const event = await ctx.db.get(eventId);

    if (!event) throw new Error('Event not found');

    // CHECK IF THERE ARE ANY AVAILABLE TICKETS RIGHT NOW
    const { available } = await checkAvailability(ctx, { eventId });
    const now = Date.now();

    if (available) {
      // IF TICKETS ARE AVAILABLE, CREATE AN OFFER ENTRY
      const waitingListId = await ctx.db.insert('waitingList', {
        eventId,
        userId,
        status: WAITING_LIST_STATUS.OFFERED, // MARK AS OFFERED
        offerExpiresAt: now + DURATIONS.TICKET_OFFER, // SET EXPIRY DATE
      });

      // SCHEDULE A JOB TO EXPIRE THIS OFFER AFTER THE OFFER DURATION
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.waitingList.expireOffer,
        {
          waitingListId,
          eventId,
        }
      );
    } else {
      // IF NO TICKETS AVAILABLE, ADD TO WAITING LIST
      await ctx.db.insert('waitingList', {
        eventId,
        userId,
        status: WAITING_LIST_STATUS.WAITING, // MARK AS WAITING
      });
    }

    // RETURN APPROPRIATE STATUS MESSAGE
    return {
      success: true,
      status: available
        ? WAITING_LIST_STATUS.OFFERED // IF AVAILABLE, STATUS IS OFFERED
        : WAITING_LIST_STATUS.WAITING, // IF NOT AVAILABLE, STATUS IS WAITING
      message: available
        ? `Ticket offered - you have ${DURATIONS.TICKET_OFFER / (60 * 1000)} minutes to purchase`
        : 'Added to waiting list - You&apos;ll be notified when a ticket is available',
    };

  },
})