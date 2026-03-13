import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LineCategory {
    id: string;
    name: string;
}
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
export interface AgentAccount {
    id: string;
    username: string;
    password: string;
    assignedLines: string[];
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOrUpdateCustomer(customer: Customer): Promise<void>;
    addOrUpdateEMIPayment(payment: EMIPayment): Promise<void>;
    addOrUpdateAgentAccount(agent: AgentAccount): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCustomer(id: string): Promise<void>;
    deleteEMIPayment(paymentId: string): Promise<void>;
    deleteAgentAccount(id: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomers(): Promise<Array<Customer>>;
    getEMIPayments(): Promise<Array<EMIPayment>>;
    getAgentAccounts(): Promise<Array<AgentAccount>>;
    getLineCategories(): Promise<Array<LineCategory>>;
    isCallerAdmin(): Promise<boolean>;
    setLineCategories(categories: Array<LineCategory>): Promise<void>;
}
