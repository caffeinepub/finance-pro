import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Customer,
  EMIPayment,
  LineCategory,
  ReportCustomField,
  User,
} from "./types";

const defaultUsers: User[] = [
  {
    id: "u1",
    username: "admin",
    password: "admin123",
    role: "admin",
    assignedLines: [],
  },
  {
    id: "u2",
    username: "agent1",
    password: "agent123",
    role: "agent",
    assignedLines: ["lc1", "lc2"],
  },
];

const defaultLineCategories: LineCategory[] = [
  { id: "lc1", name: "Line A" },
  { id: "lc2", name: "Line B" },
  { id: "lc3", name: "Line C" },
  { id: "lc4", name: "Line D" },
  { id: "lc5", name: "Line E" },
];

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

const defaultCustomers: Customer[] = [
  {
    id: "c1",
    serialNumber: "001",
    name: "Rajesh Kumar",
    phone: "9876543210",
    address: "12 Main St, Chennai",
    loanAmount: 50000,
    loanInterest: 10,
    loanType: "Post",
    loanFee: 0,
    lineCategoryId: "lc1",
    createdAt: yesterday,
    createdBy: "u1",
    isActive: true,
  },
  {
    id: "c2",
    serialNumber: "002",
    name: "Priya Sharma",
    phone: "9876543211",
    address: "45 Park Ave, Coimbatore",
    loanAmount: 30000,
    loanInterest: 5,
    loanType: "Pre",
    loanFee: 0,
    lineCategoryId: "lc2",
    createdAt: yesterday,
    createdBy: "u1",
    isActive: true,
  },
  {
    id: "c3",
    serialNumber: "003",
    name: "Suresh Babu",
    phone: "9876543212",
    address: "78 East St, Madurai",
    loanAmount: 20000,
    loanInterest: 8,
    loanType: "Post",
    loanFee: 0,
    lineCategoryId: "lc1",
    createdAt: today,
    createdBy: "u2",
    isActive: true,
  },
];

const defaultEMIs: EMIPayment[] = [
  {
    id: "e1",
    customerId: "c1",
    amount: 5000,
    paymentDate: yesterday,
    recordedBy: "u1",
    createdAt: yesterday,
  },
  {
    id: "e2",
    customerId: "c2",
    amount: 3000,
    paymentDate: yesterday,
    recordedBy: "u2",
    createdAt: yesterday,
  },
  {
    id: "e3",
    customerId: "c1",
    amount: 5000,
    paymentDate: today,
    recordedBy: "u1",
    createdAt: today,
  },
];

interface AppStore extends AppState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setLanguage: (lang: "en" | "ta") => void;
  // Lines
  addLineCategory: (name: string) => void;
  updateLineCategory: (id: string, name: string) => void;
  deleteLineCategory: (id: string) => void;
  // Customers
  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "createdBy">) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  // Users
  addUser: (u: Omit<User, "id">) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // EMI
  addEMIPayment: (e: Omit<EMIPayment, "id" | "createdAt">) => void;
  updateEMIPayment: (id: string, amount: number) => void;
  deleteEMIPayment: (id: string) => void;
  // Report fields
  saveReportCustomField: (f: ReportCustomField) => void;
  deleteReportCustomField: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      users: defaultUsers,
      lineCategories: defaultLineCategories,
      customers: defaultCustomers,
      emiPayments: defaultEMIs,
      reportCustomFields: [],
      currentUser: null,
      language: "en",

      login: (username, password) => {
        const user = get().users.find(
          (u) => u.username === username && u.password === password,
        );
        if (user) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null }),
      setLanguage: (lang) => set({ language: lang }),

      addLineCategory: (name) =>
        set((s) => ({
          lineCategories: [
            ...s.lineCategories,
            { id: crypto.randomUUID(), name },
          ],
        })),
      updateLineCategory: (id, name) =>
        set((s) => ({
          lineCategories: s.lineCategories.map((l) =>
            l.id === id ? { ...l, name } : l,
          ),
        })),
      deleteLineCategory: (id) =>
        set((s) => ({
          lineCategories: s.lineCategories.filter((l) => l.id !== id),
        })),

      addCustomer: (c) =>
        set((s) => ({
          customers: [
            ...s.customers,
            {
              ...c,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString().split("T")[0],
              createdBy: s.currentUser?.id ?? "u1",
            },
          ],
        })),
      updateCustomer: (id, c) =>
        set((s) => ({
          customers: s.customers.map((x) => (x.id === id ? { ...x, ...c } : x)),
        })),
      deleteCustomer: (id) =>
        set((s) => ({ customers: s.customers.filter((x) => x.id !== id) })),

      addUser: (u) =>
        set((s) => ({
          users: [...s.users, { ...u, id: crypto.randomUUID() }],
        })),
      updateUser: (id, u) =>
        set((s) => ({
          users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)),
          currentUser:
            s.currentUser?.id === id
              ? { ...s.currentUser, ...u }
              : s.currentUser,
        })),
      deleteUser: (id) =>
        set((s) => ({ users: s.users.filter((x) => x.id !== id) })),

      addEMIPayment: (e) =>
        set((s) => ({
          emiPayments: [
            ...s.emiPayments,
            {
              ...e,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateEMIPayment: (id, amount) =>
        set((s) => ({
          emiPayments: s.emiPayments.map((e) =>
            e.id === id ? { ...e, amount } : e,
          ),
        })),
      deleteEMIPayment: (id) =>
        set((s) => ({ emiPayments: s.emiPayments.filter((e) => e.id !== id) })),

      saveReportCustomField: (f) =>
        set((s) => ({
          reportCustomFields: s.reportCustomFields.find((x) => x.id === f.id)
            ? s.reportCustomFields.map((x) => (x.id === f.id ? f : x))
            : [...s.reportCustomFields, f],
        })),
      deleteReportCustomField: (id) =>
        set((s) => ({
          reportCustomFields: s.reportCustomFields.filter((f) => f.id !== id),
        })),
    }),
    { name: "finance-pro-store" },
  ),
);
