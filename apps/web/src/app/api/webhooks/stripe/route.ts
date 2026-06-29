import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@aegis/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
        const priceId = sub.items.data[0]?.price.id;

        const planMap: Record<string, string> = {
          [process.env.STRIPE_PRICE_LITE ?? ""]: "LITE",
          [process.env.STRIPE_PRICE_STANDARD ?? ""]: "STANDARD",
          [process.env.STRIPE_PRICE_HOUSEHOLD ?? ""]: "HOUSEHOLD",
          [process.env.STRIPE_PRICE_PREMIUM ?? ""]: "PREMIUM",
        };
        const plan = priceId ? (planMap[priceId] ?? null) : null;

        await db.household.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: sub.id,
            ...(plan ? { plan: plan as any } : {}),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.household.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { subscriptionStatus: "cancelled" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await db.household.updateMany({
          where: { stripeCustomerId: inv.customer as string },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        await db.household.updateMany({
          where: { stripeCustomerId: inv.customer as string },
          data: { subscriptionStatus: "active" },
        });
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
