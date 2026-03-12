import type { Customer, EMIPayment } from "./types";

export function loanRepayAmount(customer: Customer): number {
  if (customer.loanType === "Post") {
    return (
      (customer.loanAmount * customer.loanInterest) / 100 + customer.loanAmount
    );
  }
  return customer.loanAmount;
}

export function paidAmount(customerId: string, emis: EMIPayment[]): number {
  return emis
    .filter((e) => e.customerId === customerId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function outstandingAmount(
  customer: Customer,
  emis: EMIPayment[],
): number {
  return loanRepayAmount(customer) - paidAmount(customer.id, emis);
}

export function loanStatus(
  customer: Customer,
  emis: EMIPayment[],
): "Active" | "Completed" {
  return outstandingAmount(customer, emis) > 0 ? "Active" : "Completed";
}

export function loanFeeAmount(customer: Customer): number {
  return (customer.loanAmount * customer.loanInterest) / 100;
}
