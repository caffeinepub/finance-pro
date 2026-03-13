import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface EMIPayment {
    id: string;
    createdAt: string;
    recordedBy: string;
    paymentDate: string;
    customerId: string;
    amount: number;
}
export interface Customer {
    id: string;
    loanFee: number;
    loanInterest: number;
    loanAmount: number;
    name: string;
    createdAt: string;
    createdBy: string;
    isActive: boolean;
    loanType: string;
    serialNumber: string;
    address: string;
    phone: string;
    lineCategoryId: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOrUpdateCustomer(customer: Customer): Promise<void>;
    addOrUpdateEMIPayment(payment: EMIPayment): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCustomer(id: string): Promise<void>;
    deleteEMIPayment(paymentId: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomers(): Promise<Array<Customer>>;
    getEMIPayments(): Promise<Array<EMIPayment>>;
    isCallerAdmin(): Promise<boolean>;
}
