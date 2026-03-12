export type Role = "admin" | "agent";
export type LoanType = "Pre" | "Post";

export interface LineCategory {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  assignedLines: string[];
}

export interface Customer {
  id: string;
  serialNumber: string;
  name: string;
  phone: string;
  address: string;
  loanAmount: number;
  loanInterest: number;
  loanType: LoanType;
  loanFee: number;
  lineCategoryId: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface EMIPayment {
  id: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  recordedBy: string;
  createdAt: string;
}

export interface ReportCustomField {
  id: string;
  reportKey: string;
  side: "left" | "right";
  label: string;
  value: number;
}

export interface AppState {
  users: User[];
  lineCategories: LineCategory[];
  customers: Customer[];
  emiPayments: EMIPayment[];
  reportCustomFields: ReportCustomField[];
  currentUser: User | null;
  language: "en" | "ta";
}
