import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentQuerySchema } from "@/validators/payment";
import { PaystackService } from "@/lib/payments/paystack";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfillment";

/**
 * GET /api/payments/verify?reference=NOT-PAY-...
 * Verifies Paystack transaction status on server-side and fulfills tickets if verified.
 * Safe for student callback redirects and client status verification.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawRef = searchParams.get("reference") || searchParams.get("trxref") || undefined;

    const validation = verifyPaymentQuerySchema.safeParse({ reference: rawRef });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or missing payment reference parameter.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reference } = validation.data;

    // 1. Verify transaction status with Paystack directly
    let paystackResponse;
    try {
      paystackResponse = await PaystackService.verifyTransaction(reference);
    } catch (paystackError) {
      console.error(`❌ Paystack verification call failed for ref ${reference}:`, paystackError);
      return NextResponse.json(
        {
          success: false,
          message:
            paystackError instanceof Error
              ? paystackError.message
              : "Could not reach Paystack to verify this transaction. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    // 2. Fulfill verified payment idempotently
    const fulfillment = await fulfillVerifiedPayment({
      reference,
      paystackData: paystackResponse,
      verifiedBy: "callback",
    });

    return NextResponse.json(
      {
        success: fulfillment.success,
        message: fulfillment.message,
        data: fulfillment.data,
      },
      { status: fulfillment.status }
    );
  } catch (error) {
    console.error("❌ Error in payment verification route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while verifying the payment.",
      },
      { status: 500 }
    );
  }
}
