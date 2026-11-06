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

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode?: string;
  gateway?: string;
  active: boolean;
  country: string;
  currency: string;
}

export interface PaystackResolveAccountResponse {
  account_number: string;
  account_name: string;
  bank_id?: number;
}

export interface PaystackRecipientResponse {
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    account_name: string | null;
    bank_code: string;
    bank_name: string;
  };
  active: boolean;
  id: number;
  currency: string;
}

export interface PaystackTransferResponse {
  reference: string;
  amount: number; // in kobo
  transfer_code: string;
  id: number;
  status: "pending" | "success" | "failed" | "processing";
  recipient: number | string;
}

export interface PaystackRefundResponse {
  id: number;
  transaction: number | string;
  amount: number; // in kobo
  currency: string;
  status: "pending" | "processing" | "success" | "failed";
  refunded_by?: string;
  refunded_at?: string;
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

  /**
   * List supported banks from Paystack
   */
  public static async listBanks(country = "nigeria"): Promise<PaystackBank[]> {
    const url = `${this.baseUrl}/bank?country=${encodeURIComponent(country)}&perPage=100`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, { method: "GET" })) as {
        status: boolean;
        data: PaystackBank[];
        message?: string;
      };
      if (!result.status) {
        throw new Error(result.message || "Failed to fetch bank list from Paystack");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      // Fallback simulated Nigerian banks
      return [
        { id: 1, name: "Access Bank", slug: "access-bank", code: "044", active: true, country: "Nigeria", currency: "NGN" },
        { id: 2, name: "Guaranty Trust Bank", slug: "gtbank", code: "058", active: true, country: "Nigeria", currency: "NGN" },
        { id: 3, name: "First Bank of Nigeria", slug: "first-bank", code: "011", active: true, country: "Nigeria", currency: "NGN" },
        { id: 4, name: "United Bank For Africa", slug: "uba", code: "033", active: true, country: "Nigeria", currency: "NGN" },
        { id: 5, name: "Zenith Bank", slug: "zenith-bank", code: "057", active: true, country: "Nigeria", currency: "NGN" },
        { id: 6, name: "Kuda Bank", slug: "kuda-bank", code: "50211", active: true, country: "Nigeria", currency: "NGN" },
        { id: 7, name: "OPay", slug: "opay", code: "999992", active: true, country: "Nigeria", currency: "NGN" },
        { id: 8, name: "Moniepoint MFB", slug: "moniepoint-mfb", code: "50515", active: true, country: "Nigeria", currency: "NGN" },
      ];
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to fetch banks from Paystack");
    }

    return data.data;
  }

  /**
   * Resolve a bank account number against bank code
   */
  public static async resolveAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<PaystackResolveAccountResponse> {
    const url = `${this.baseUrl}/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, { method: "GET" })) as {
        status: boolean;
        data: PaystackResolveAccountResponse;
        message?: string;
      };
      if (!result.status) {
        throw new Error(result.message || "Failed to resolve account number");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        account_number: accountNumber,
        account_name: "OAU STUDENT TEST ACCOUNT",
        bank_id: 1,
      };
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to resolve bank account number");
    }

    return data.data;
  }

  /**
   * Create a Transfer Recipient on Paystack for disbursements
   */
  public static async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    description?: string;
  }): Promise<PaystackRecipientResponse> {
    const url = `${this.baseUrl}/transferrecipient`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, {
        method: "POST",
        body: JSON.stringify(params),
      })) as {
        status: boolean;
        data: PaystackRecipientResponse;
        message?: string;
      };
      if (!result.status) {
        throw new Error(result.message || "Failed to create transfer recipient");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        recipient_code: `RCP_MOCK_${Date.now()}`,
        type: "nuban",
        name: params.name,
        details: {
          account_number: params.accountNumber,
          account_name: params.name,
          bank_code: params.bankCode,
          bank_name: "Simulated Bank",
        },
        active: true,
        id: Math.floor(Math.random() * 100000),
        currency: "NGN",
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
        description: params.description,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to create Paystack transfer recipient");
    }

    return data.data;
  }

  /**
   * Initiate a Transfer via Paystack Transfer API
   */
  public static async initiateTransfer(params: {
    amountInKobo: number;
    recipientCode: string;
    reference: string;
    reason?: string;
  }): Promise<PaystackTransferResponse> {
    const url = `${this.baseUrl}/transfer`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, {
        method: "POST",
        body: JSON.stringify(params),
      })) as {
        status: boolean;
        data: PaystackTransferResponse;
        message?: string;
      };
      if (!result.status) {
        throw new Error(result.message || "Failed to initiate transfer");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        reference: params.reference,
        amount: params.amountInKobo,
        transfer_code: `TRF_MOCK_${Date.now()}`,
        id: Math.floor(Math.random() * 100000),
        status: "success",
        recipient: params.recipientCode,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: params.amountInKobo,
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason || "NOTARI Organizer Payout",
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to initiate Paystack transfer");
    }

    return data.data;
  }

  /**
   * Initiate a Refund via Paystack Refund API
   */
  public static async initiateRefund(params: {
    transactionRefOrId: string;
    amountInKobo?: number;
    customerNote?: string;
    merchantNote?: string;
  }): Promise<PaystackRefundResponse> {
    const url = `${this.baseUrl}/refund`;

    if (this.mockFetchHandler) {
      const result = (await this.mockFetchHandler(url, {
        method: "POST",
        body: JSON.stringify(params),
      })) as {
        status: boolean;
        data: PaystackRefundResponse;
        message?: string;
      };
      if (!result.status) {
        throw new Error(result.message || "Failed to initiate refund");
      }
      return result.data;
    }

    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        id: Math.floor(Math.random() * 100000),
        transaction: params.transactionRefOrId,
        amount: params.amountInKobo || 100000,
        currency: "NGN",
        status: "success",
        refunded_by: "system_admin",
        refunded_at: new Date().toISOString(),
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: params.transactionRefOrId,
        amount: params.amountInKobo,
        customer_note: params.customerNote,
        merchant_note: params.merchantNote,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to initiate Paystack refund");
    }

    return data.data;
  }
}
