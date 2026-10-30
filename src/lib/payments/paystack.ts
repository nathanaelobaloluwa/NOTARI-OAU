import { env } from "@/config/env";

export interface PaystackInitializeParams {
  email: string;
  amount: number; // in NGN
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number; // in kobo
  paid_at: string;
  channel: string;
  currency: string;
  customer: {
    email: string;
  };
}

/**
 * Paystack Integration Boundary
 * Handles communication with Paystack payment gateway on server-side
 */
export class PaystackService {
  private static secretKey = env.PAYSTACK_SECRET_KEY;
  private static baseUrl = "https://api.paystack.co";

  /**
   * Convert Naira to Kobo (Paystack requires smallest currency unit)
   */
  public static toKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  /**
   * Convert Kobo to Naira
   */
  public static toNaira(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Initialize a new Paystack transaction
   */
  public static async initializeTransaction(
    params: PaystackInitializeParams
  ): Promise<PaystackInitializeResponse> {
    if (!this.secretKey) {
      console.warn("⚠️ [PAYSTACK] PAYSTACK_SECRET_KEY is not set. Running in simulation mode.");
      return {
        authorization_url: `${env.NEXT_PUBLIC_APP_URL}/mock-checkout?reference=${params.reference}`,
        access_code: `mock_code_${params.reference}`,
        reference: params.reference,
      };
    }

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: this.toKobo(params.amount),
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to initialize Paystack transaction");
    }

    return data.data;
  }

  /**
   * Verify transaction on server (Security: Never trust client verification)
   */
  public static async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    if (!this.secretKey) {
      console.warn("⚠️ [PAYSTACK] Running in simulation mode for transaction verification.");
      return {
        status: "success",
        reference,
        amount: 500000,
        paid_at: new Date().toISOString(),
        channel: "card",
        currency: "NGN",
        customer: { email: "student@oau.edu.ng" },
      };
    }

    const response = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to verify transaction");
    }

    return data.data;
  }
}
