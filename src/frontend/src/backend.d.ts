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
export interface EMIPaymentMeta {
    paymentMethod: string;
    cashAmount: number;
    transferAmount: number;
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
// NOTE: AgentAccount type must NOT gain new required fields — it would break
// stable variable deserialization on canister upgrade, wiping all agent data.
// Extra properties (e.g. dashboard access) are encoded as special marker
// strings inside assignedLines: "__dash_on__" = dashboard enabled.
export interface AgentAccount {
    id: string;
    username: string;
    password: string;
    assignedLines: string[];
}
export interface CloudSavedReport {
    id: string;
    reportDate: string;
    lineName: string;
    preAmount: number;
    collection: number;
    loanFee: number;
    lending: number;
    expense: number;
    dynLeftJson: string;
    dynRightJson: string;
    leftTotal: number;
    rightTotal: number;
    reminder: number;
    savedAt: string;
    savedBy: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOrUpdateCustomer(customer: Customer): Promise<void>;
    addOrUpdateEMIPayment(payment: EMIPayment): Promise<void>;
    addOrUpdateSavedReport(report: CloudSavedReport): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCustomer(id: string): Promise<void>;
    deleteEMIPayment(paymentId: string): Promise<void>;
    deleteSavedReport(key: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomers(): Promise<Array<Customer>>;
    getEMIPayments(): Promise<Array<EMIPayment>>;
    getAgentAccounts(): Promise<Array<AgentAccount>>;
    getLineCategories(): Promise<Array<LineCategory>>;
    getSavedReports(): Promise<Array<CloudSavedReport>>;
    getCustomerTimestamps(): Promise<Array<[string, string]>>;
    isCallerAdmin(): Promise<boolean>;
    setCustomers(customers: Array<Customer>): Promise<void>;
    setEMIPayments(payments: Array<EMIPayment>): Promise<void>;
    setLineCategories(categories: Array<LineCategory>): Promise<void>;
    setAgentAccounts(agents: Array<AgentAccount>): Promise<void>;
    setSavedReports(reports: Array<CloudSavedReport>): Promise<void>;
    setCustomerTimestamps(entries: Array<[string, string]>): Promise<void>;
    getLockedLines(): Promise<Array<string>>;
    setLockedLines(lines: Array<string>): Promise<void>;
    setEMIPaymentMeta(emiId: string, meta: EMIPaymentMeta): Promise<undefined>;
    setEMIPaymentMetaBulk(entries: Array<[string, EMIPaymentMeta]>): Promise<undefined>;
    getEMIPaymentMeta(): Promise<Array<[string, EMIPaymentMeta]>>;
    deleteEMIPaymentMeta(emiId: string): Promise<undefined>;
}
