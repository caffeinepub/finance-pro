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
  dashboardEnabled?: boolean;
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
  createdAt: string; // loan date (YYYY-MM-DD)
  addedAt?: string; // full ISO timestamp when customer was added to system
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

export interface SavedReportField {
  label: string;
  value: number;
}

export interface SavedReport {
  id: string;
  reportDate: string;
  lineName: string;
  preAmount: number;
  collection: number;
  loanFee: number;
  lending: number;
  expense: number;
  dynLeft: SavedReportField[];
  dynRight: SavedReportField[];
  leftTotal: number;
  rightTotal: number;
  reminder: number;
  savedAt: string;
  savedBy: string;
  actualAmount?: number;
  amountStatus?: "shortage" | "high" | "ok";
}

export interface CustomerMedia {
  photoUrl: string;
  idProofUrls: string[];
}

export interface AppState {
  users: User[];
  lineCategories: LineCategory[];
  customers: Customer[];
  emiPayments: EMIPayment[];
  reportCustomFields: ReportCustomField[];
  savedReports: SavedReport[];
  customerMedia: Record<string, CustomerMedia>;
  currentUser: User | null;
  language: "en" | "ta";
}
