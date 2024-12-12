'use server';

import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
import { auth } from "@clerk/nextjs/server";
import { DURATIONS } from "../../convex/constants";

export type StripeCheckoutMetaData = {
  eventId: Id<'events'>;
  userId: string;
  waitingListId: Id<'waitingList'>;
};

export async function createStripeCheckoutSession({ eventId, }: { eventId: Id<'events'> }) {
  const { userId } = await auth();

  if (!userId) throw new Error('No authenticated');

  const convex = getConvexClient();

  // GET EVENT DETAILS
  const event = await convex.query(api.events.getById, { eventId });

  if (!event) throw new Error('Event not found');

  // GET WAITING LIST ENTRY
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, { eventId, userId });

  if (!queuePosition || queuePosition.status !== 'offered') {
    throw new Error('No valid ticket offer found');
  }

  const stripeConnectId = await convex.query(
    api.users.getUsersStripeConnectId,
    {
      userId: event.userId,
    }
  );

  if (!stripeConnectId) {
    throw new Error('Stripe Connect ID not found for owner of th event!');
  }

  if (!queuePosition.offerExpiresAt) {
    throw new Error('Ticket offer has no expiration date');
  }

  const metadata: StripeCheckoutMetaData = {
    eventId,
    userId,
    waitingListId: queuePosition._id,
  };

  // CREATE STRIPE CHECKOUT SESSION
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: event.name,
            description: event.description,
          },
          unit_amount: Math.round(event.price * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: Math.round(event.price * 100 * 0.01),
    },
    expires_at: Math.floor(Date.now() / 1000) + DURATIONS.TICKET_OFFER / 1000, // 30 MINUTES (STRIPE CHECKOUT MINIMUM EXPIRATION TIME)
    mode: 'payment',
    success_url: `${baseUrl}/tickets/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/event/${eventId}`,
    metadata,
  },
    {
      stripeAccount: stripeConnectId,
    }
  );

  return {
    sessionId: session.id,
    sessionUrl: session.url,
  }
}