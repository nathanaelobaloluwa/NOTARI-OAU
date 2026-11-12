import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import { EmailDelivery } from "@/models/EmailDelivery";
import { verifyResendWebhookSignature } from "@/lib/email/webhook";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: {
      message?: string;
      code?: string;
      type?: string;
    };
    error?: string;
    [key: string]: unknown;
  };
}

/**
 * POST /api/webhooks/resend
 * Authoritative webhook receiver for Resend delivery, bounce, and failure events.
 * Updates EmailDelivery status accurately and records cryptographic audit logs.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    // 1. Authenticate webhook request
    if (env.RESEND_WEBHOOK_SECRET) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn("⚠️ [RESEND_WEBHOOK] Missing Svix signature headers.");
        return NextResponse.json(
          { success: false, message: "Missing required signature headers" },
          { status: 401 }
        );
      }

      const isValid = verifyResendWebhookSignature({
        payload: rawBody,
        svixId,
        svixTimestamp,
        svixSignature,
        secret: env.RESEND_WEBHOOK_SECRET,
      });

      if (!isValid) {
        console.warn("⚠️ [RESEND_WEBHOOK] Cryptographic signature verification failed.");
        return NextResponse.json(
          { success: false, message: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error(
        "🚨 [RESEND_WEBHOOK] RESEND_WEBHOOK_SECRET is not configured in production. Rejecting unverified webhook."
      );
      return NextResponse.json(
        { success: false, message: "Webhook secret unconfigured on server" },
        { status: 500 }
      );
    } else {
      console.log("ℹ️ [RESEND_WEBHOOK] Webhook received in non-production without secret verification.");
    }

    // 2. Parse JSON payload
    let body: ResendWebhookPayload;
    try {
      body = JSON.parse(rawBody) as ResendWebhookPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { type, data, created_at } = body;
    const emailId = data?.email_id;

    if (!emailId || !type) {
      return NextResponse.json(
        { success: false, message: "Missing email_id or event type in webhook payload" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 3. Match event to the authoritative EmailDelivery record
    const delivery = await EmailDelivery.findOne({ providerMessageId: emailId });
    if (!delivery) {
      console.log(
        `ℹ️ [RESEND_WEBHOOK] No EmailDelivery record matched providerMessageId: ${emailId}. Acknowledging.`
      );
      return NextResponse.json({ success: true, matched: false });
    }

    // 4. Duplicate Webhook Event Prevention
    const eventId = svixId || `${type}_${emailId}_${created_at}`;
    const alreadyProcessed = delivery.webhookEvents?.some((e) => e.eventId === eventId);
    if (alreadyProcessed) {
      console.log(
        `ℹ️ [RESEND_WEBHOOK] Event ${eventId} for message ${emailId} already processed. Skipping duplicate.`
      );
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 5. Update Status Based on Event Type
    const eventTimestamp = created_at ? new Date(created_at) : new Date();

    switch (type) {
      case "email.delivered":
        delivery.status = "delivered";
        delivery.deliveredAt = eventTimestamp;
        delivery.error = undefined;
        delivery.nextRetryAt = undefined;
        break;

      case "email.bounced":
        delivery.status = "bounced";
        delivery.isNonRetryable = true;
        delivery.error = data.bounce?.message || "Recipient address bounced";
        delivery.nextRetryAt = undefined;
        break;

      case "email.complained":
        delivery.status = "bounced";
        delivery.isNonRetryable = true;
        delivery.error = "Recipient marked email as spam / abuse complaint";
        delivery.nextRetryAt = undefined;
        break;

      case "email.failed":
        delivery.status = "failed";
        delivery.error = data.error || "Email delivery failed on remote provider";
        break;

      case "email.delivery_delayed":
        if (delivery.status !== "delivered") {
          delivery.status = "retry_scheduled";
        }
        break;

      default:
        // Other events (e.g., email.sent, email.opened, email.clicked) only logged to webhookEvents
        break;
    }

    // 6. Record Audit Trail
    if (!delivery.webhookEvents) {
      delivery.webhookEvents = [];
    }
    delivery.webhookEvents.push({
      eventId,
      type,
      timestamp: eventTimestamp,
      raw: data,
    });

    await delivery.save();

    console.log(
      `✅ [RESEND_WEBHOOK] Processed ${type} for ${delivery.recipient} (${delivery.providerMessageId}). Status is now '${delivery.status}'.`
    );

    return NextResponse.json({
      success: true,
      type,
      deliveryId: delivery._id.toString(),
      status: delivery.status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [RESEND_WEBHOOK_EXCEPTION]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
