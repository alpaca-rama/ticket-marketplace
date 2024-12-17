import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "../../../../../convex/_generated/api";
import Stripe from "stripe";
import { StripeCheckoutMetaData } from "@/actions/createStripeCheckoutSession";
import { metadata } from "@/app/layout";
import { log } from "console";

export async function POST(req: Request) {
  console.log('WEbhook recieved');

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

  console.log('Webhook signature: ', signature ? 'Presenet' : 'Missing');

  let event: Stripe.Event;

  try {
    console.log('Attempting to construct webhook event');

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('Webhook event constructed successfully: ', event.type);
  } catch (error) {
    console.error('Webhook construction failed: ', error);

    return new Response(`Webhook Error: ${(error as Error).message}`, {
      status: 400,
    })
  }

  const convex = getConvexClient();

  if (event.type === 'checkout.session.completed') {
    console.log('Processing checkout.session.completed event');

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata as StripeCheckoutMetaData;

    console.log('Session metadata: ', metadata);
    console.log('Convex client: ', convex);

    try {
      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        paymentInfo: {
          paymentIntentId: session.payment_intent as string,
          amount: session.amount_total ?? 0,
        }
      });

      console.log('Purchase ticket mutation completed', result);
    } catch (error) {
      console.error('Error processing webhook: ', error);

      return new Response('Error processing webhook', { status: 200 });
    }
  }
}