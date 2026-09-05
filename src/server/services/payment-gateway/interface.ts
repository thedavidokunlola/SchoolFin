// src/server/services/payment-gateway/interface.ts
// PaymentGateway abstraction interface
// Locked per Boundary 2 and Rule PAY-8

import { Decimal } from "decimal.js";

export interface InitiatePaymentParams {
  amount: Decimal | string | number;
  currency?: string;
  txRef: string;
  redirectUrl: string;
  customer: {
    email: string;
    name: string;
    phone?: string;
  };
  customizations: {
    title: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  status: "success" | "error";
  paymentLink?: string;
  message?: string;
}

export interface TransactionVerificationResult {
  status: "success" | "failed" | "pending";
  txRef: string;
  flutterwaveId: number;
  amount: string;
  currency: string;
  cardToken?: string | null;
  paymentType: "card" | "account" | "banktransfer" | "ussd" | string;
  customerEmail: string;
  rawPayload: Record<string, unknown>;
}

export interface ChargeTokenParams {
  token: string;
  amount: Decimal | string | number;
  currency?: string;
  txRef: string;
  email: string;
  fullName: string;
}

export interface ChargeResult {
  status: "success" | "failed" | "pending";
  txRef: string;
  flutterwaveId?: number;
  amount: string;
  message?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentGateway {
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyTransaction(transactionId: string | number): Promise<TransactionVerificationResult>;
  tokeniseCard(transactionId: string | number): Promise<string | null>;
  chargeToken(params: ChargeTokenParams): Promise<ChargeResult>;
  verifyWebhookSignature(signatureHeader: string | null): boolean;
}
