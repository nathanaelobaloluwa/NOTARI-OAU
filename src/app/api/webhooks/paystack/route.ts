import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/config/env";

/**
 * Paystack Webhook Handler Boundary
 * Secure server-to-server transaction verification
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!env.PAYSTACK_SECRET_KEY) {
      console.warn("⚠️ [WEBHOOK] Paystack secret key not set. Skipping signature verification in scaffold.");
      return NextResponse.json({ status: "success", message: "Webhook received (scaffold mode)" });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    // Verify cryptographic signature with constant-time comparison to prevent timing attacks
    const hash = crypto
      .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    const hashBuffer = Buffer.from(hash, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (
      hashBuffer.byteLength !== signatureBuffer.byteLength ||
      !crypto.timingSafeEqual(hashBuffer, signatureBuffer)
    ) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Foundation event dispatch
    if (payload.event === "charge.success") {
      const { reference, amount, customer } = payload.data;
      console.log(`💳 [PAYSTACK_WEBHOOK] Payment successful for ref: ${reference}, amount: ${amount}, customer: ${customer.email}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("❌ Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
