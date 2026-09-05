// src/server/services/payment-gateway/index.ts
// Singleton PaymentGateway instance
// Locked per Boundary 2 and Rule PAY-8

import type { PaymentGateway } from "./interface";
import { FlutterwaveAdapter } from "./flutterwave";

export * from "./interface";

const globalForPaymentGateway = globalThis as unknown as {
  paymentGateway: PaymentGateway | undefined;
};

export const paymentGateway =
  globalForPaymentGateway.paymentGateway ?? new FlutterwaveAdapter();

if (process.env.NODE_ENV !== "production") {
  globalForPaymentGateway.paymentGateway = paymentGateway;
}
