// src/server/services/payment-gateway/flutterwave.ts
// FlutterwaveAdapter implementing PaymentGateway
// Locked per Boundary 2 and Rule PAY-8

import { config } from "@/lib/config";
import type {
  PaymentGateway,
  InitiatePaymentParams,
  InitiatePaymentResult,
  TransactionVerificationResult,
  ChargeTokenParams,
  ChargeResult,
} from "./interface";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

export class FlutterwaveAdapter implements PaymentGateway {
  private readonly secretKey: string;
  private readonly secretHash: string;
  private readonly publicKey: string;

  constructor() {
    this.secretKey = config.flutterwave.secretKey;
    this.secretHash = config.flutterwave.secretHash;
    this.publicKey = config.flutterwave.publicKey;
  }

  /**
   * Verify Flutterwave webhook signature header
   */
  verifyWebhookSignature(signatureHeader: string | null): boolean {
    if (!signatureHeader || !this.secretHash) return false;
    return signatureHeader === this.secretHash;
  }

  /**
   * Initiate standard Flutterwave hosted checkout link
   */
  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const payload = {
      tx_ref: params.txRef,
      amount: params.amount.toString(),
      currency: params.currency || "NGN",
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customer.email,
        name: params.customer.name,
        phonenumber: params.customer.phone,
      },
      customizations: {
        title: params.customizations.title,
        description: params.customizations.description,
        logo: params.customizations.logo,
      },
      meta: params.meta,
    };

    try {
      const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success" && data.data?.link) {
        return {
          status: "success",
          paymentLink: data.data.link,
          message: data.message,
        };
      }

      return {
        status: "error",
        message: data.message || "Failed to generate payment link",
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Network error contacting Flutterwave",
      };
    }
  }

  /**
   * Verify transaction with Flutterwave API
   */
  async verifyTransaction(transactionId: string | number): Promise<TransactionVerificationResult> {
    const isRef = typeof transactionId === "string" && !/^\d+$/.test(transactionId);
    const url = isRef
      ? `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionId)}`
      : `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.status === "success" && data.data) {
      const tx = data.data;
      const isSuccessful = tx.status === "successful";

      return {
        status: isSuccessful ? "success" : tx.status === "failed" ? "failed" : "pending",
        txRef: tx.tx_ref,
        flutterwaveId: tx.id,
        amount: tx.amount.toString(),
        currency: tx.currency,
        cardToken: tx.card?.token || null,
        paymentType: tx.payment_type || "card",
        customerEmail: tx.customer?.email || "",
        rawPayload: data,
      };
    }

    return {
      status: "failed",
      txRef: String(transactionId),
      flutterwaveId: 0,
      amount: "0.00",
      currency: "NGN",
      cardToken: null,
      paymentType: "unknown",
      customerEmail: "",
      rawPayload: data,
    };
  }

  /**
   * Extract card token from transaction verification
   */
  async tokeniseCard(transactionId: string | number): Promise<string | null> {
    const verification = await this.verifyTransaction(transactionId);
    return verification.cardToken || null;
  }

  /**
   * Charge recurring card token for installment payments
   */
  async chargeToken(params: ChargeTokenParams): Promise<ChargeResult> {
    const payload = {
      token: params.token,
      currency: params.currency || "NGN",
      amount: params.amount.toString(),
      email: params.email,
      tx_ref: params.txRef,
      full_name: params.fullName,
    };

    try {
      const response = await fetch(`${FLUTTERWAVE_BASE_URL}/tokenized-charges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success" && data.data?.status === "successful") {
        return {
          status: "success",
          txRef: data.data.tx_ref,
          flutterwaveId: data.data.id,
          amount: data.data.amount.toString(),
          message: data.message,
          rawPayload: data,
        };
      }

      return {
        status: "failed",
        txRef: params.txRef,
        amount: params.amount.toString(),
        message: data.message || "Token charge was not successful",
        rawPayload: data,
      };
    } catch (error) {
      return {
        status: "failed",
        txRef: params.txRef,
        amount: params.amount.toString(),
        message: error instanceof Error ? error.message : "Network error executing token charge",
      };
    }
  }
}
