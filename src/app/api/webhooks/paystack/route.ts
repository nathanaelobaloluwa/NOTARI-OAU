import { NextRequest, NextResponse } from "next/server";
import { PaystackService, PaystackVerifyResponse } from "@/lib/payments/paystack";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfillment";

/**
 * POST /api/webhooks/paystack
 * Backward-compatible endpoint for Paystack webhook events.
 * Fully verifies HMAC-SHA512 raw body signature and fulfills tickets idempotently.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-paystack-signature header." },
        { status: 400 }
      );
    }

    const isValid = PaystackService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("⚠️ [WEBHOOK] Rejected unauthorized Paystack webhook with invalid signature.");
      return NextResponse.json(
        { error: "Invalid cryptographic signature." },
        { status: 401 }
      );
    }

    let payload: { event?: string; data?: unknown };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }

    if (payload.event === "charge.success" && payload.data) {
      const transactionData = payload.data as PaystackVerifyResponse;
      console.log(
        `💳 [WEBHOOK] Processing charge.success for ref: ${transactionData.reference}, amount: ${transactionData.amount}`
      );

      const result = await fulfillVerifiedPayment({
        reference: transactionData.reference,
        paystackData: transactionData,
        verifiedBy: "webhook",
      });
      console.log(
        `✅ [WEBHOOK] Fulfillment result for ${transactionData.reference}: ${result.message}`
      );
    }

    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected error handling Paystack webhook:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
