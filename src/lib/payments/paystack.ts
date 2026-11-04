import crypto from "crypto";
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
  paid_at?: string;
  channel?: string;
  currency: string;
  id?: number | string;
  gateway_response?: string;
  metadata?: Record<string, unknown>;
  customer: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

type MockFetchHandler = (url: string, init?: RequestInit) => Promise<unknown>;

/**
 * Paystack Integration Boundary
 * Handles communication with Paystack payment gateway on server-side.
 * Never trust client-reported payment state.
 */
export class PaystackService {
  private static baseUrl = "https://api.paystack.co";
  private static mockFetchHandler: MockFetchHandler | null = null;

  /**
   * Test hook: allows integration tests to mock Paystack API responses
   */
  public static setMockFetchHandler(handler: MockFetchHandler | null): void {
    this.mockFetchHandler = handler;
  }

  private static getSecretKey(): string | undefined {
    return process.env.PAYSTACK_SECRET_KEY || env.PAYSTACK_SECRET_KEY;
  }

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
    const url = `${this.baseUrl}/transaction/initialize`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, {
        method: "POST",
        body: JSON.stringify(params),
      })) as { status: boolean; data: PaystackInitializeResponse; message?: string };
      if (!result.status) {
        throw new Error(result.message || "Failed to initialize Paystack transaction");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      console.warn("⚠️ [PAYSTACK] PAYSTACK_SECRET_KEY is not set. Running in simulation mode.");
      return {
        authorization_url: `${env.NEXT_PUBLIC_APP_URL}/mock-checkout?reference=${encodeURIComponent(params.reference)}`,
        access_code: `mock_code_${params.reference}`,
        reference: params.reference,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
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
    const url = `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, {
        method: "GET",
      })) as { status: boolean; data: PaystackVerifyResponse; message?: string };
      if (!result.status) {
        throw new Error(result.message || "Failed to verify transaction");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      console.warn("⚠️ [PAYSTACK] Running in simulation mode for transaction verification.");
      return {
        status: "success",
        reference,
        amount: 500000,
        paid_at: new Date().toISOString(),
        channel: "card",
        currency: "NGN",
        id: `mock_tx_${Date.now()}`,
        gateway_response: "Successful",
        customer: { email: "student@notari.oau.edu.ng" },
      };
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to verify transaction");
    }

    return data.data;
  }

  /**
   * Verifies the cryptographic HMAC-SHA512 webhook signature from Paystack
   * Uses timingSafeEqual with buffer byteLength validation to prevent timing attacks and RangeError crashes.
   */
  public static verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signature || typeof signature !== "string") {
      return false;
    }

    const computedHash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    const computedBuffer = Buffer.from(computedHash, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (computedBuffer.byteLength !== signatureBuffer.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
  }
}
