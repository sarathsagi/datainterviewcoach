import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = "force-dynamic";

function mapStripeStatus(status: string): "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "TRIALING" | "INCOMPLETE" {
  switch (status) {
    case "active": return "ACTIVE";
    case "canceled": return "CANCELED";
    case "past_due": return "PAST_DUE";
    case "unpaid": return "UNPAID";
    case "trialing": return "TRIALING";
    case "incomplete": return "INCOMPLETE";
    default: return "ACTIVE";
  }
}

function mapPlan(priceId: string): "PRO_MONTHLY" | "PRO_YEARLY" {
  if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) return "PRO_YEARLY";
  return "PRO_MONTHLY";
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("Webhook: No userId in subscription metadata");
    return;
  }

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? "";
  // In Stripe v22 (dahlia), current_period_end moved to subscription items
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date();

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd,
      status: mapStripeStatus(subscription.status),
      plan: mapPlan(priceId),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd,
      status: mapStripeStatus(subscription.status),
      plan: mapPlan(priceId),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // In dahlia API, subscription is under parent.subscription_details
        const subscriptionId =
          (invoice.parent as { subscription_details?: { subscription: string } })
            ?.subscription_details?.subscription ?? null;
        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
