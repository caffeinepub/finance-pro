import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  deleteAgentFromCloud,
  deleteCustomerFromCloud,
  deleteEMIFromCloud,
  loadAgentAccounts,
  loadFromCloud,
  loadLineCategories,
  syncAgentToCloud,
  syncCustomerToCloud,
  syncEMIToCloud,
  syncLineCategoriesToCloud,
} from "../utils/cloudSync";
import type {
  AppState,
  Customer,
  EMIPayment,
  LineCategory,
  ReportCustomField,
  SavedReport,
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

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface AppStore extends AppState {
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
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
  // Saved Reports
  saveReport: (r: Omit<SavedReport, "id" | "savedAt">) => void;
  deleteSavedReport: (id: string) => void;
  // Restore
  restoreFromBackup: (data: {
    customers?: Customer[];
    emiPayments?: EMIPayment[];
    lineCategories?: LineCategory[];
    reportCustomFields?: ReportCustomField[];
    savedReports?: SavedReport[];
  }) => void;
  // Cloud sync
  loadCloudData: () => Promise<void>;
  loadAgentsPreLogin: () => Promise<void>;
}

function fireAndForget(
  fn: () => Promise<void>,
  setSyncStatus: (s: SyncStatus) => void,
) {
  setSyncStatus("syncing");
  fn()
    .then(() => setSyncStatus("synced"))
    .catch(() => setSyncStatus("error"));
}

/** Convert a User (agent) to the cloud AgentAccount shape */
function userToAgentAccount(u: User) {
  return {
    id: u.id,
    username: u.username,
    password: u.password,
    assignedLines: u.assignedLines,
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      users: defaultUsers,
      lineCategories: defaultLineCategories,
      customers: [] as Customer[],
      emiPayments: [] as EMIPayment[],
      reportCustomFields: [],
      savedReports: [],
      currentUser: null,
      language: "en",
      syncStatus: "idle" as SyncStatus,

      setSyncStatus: (status) => set({ syncStatus: status }),

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

      addLineCategory: (name) => {
        set((s) => ({
          lineCategories: [
            ...s.lineCategories,
            { id: crypto.randomUUID(), name },
          ],
        }));
        fireAndForget(
          () => syncLineCategoriesToCloud(get().lineCategories),
          get().setSyncStatus,
        );
      },
      updateLineCategory: (id, name) => {
        set((s) => ({
          lineCategories: s.lineCategories.map((l) =>
            l.id === id ? { ...l, name } : l,
          ),
        }));
        fireAndForget(
          () => syncLineCategoriesToCloud(get().lineCategories),
          get().setSyncStatus,
        );
      },
      deleteLineCategory: (id) => {
        set((s) => ({
          lineCategories: s.lineCategories.filter((l) => l.id !== id),
        }));
        fireAndForget(
          () => syncLineCategoriesToCloud(get().lineCategories),
          get().setSyncStatus,
        );
      },

      addCustomer: (c) => {
        const newCustomer: Customer = {
          ...c,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString().split("T")[0],
          createdBy: get().currentUser?.id ?? "u1",
        };
        set((s) => ({ customers: [...s.customers, newCustomer] }));
        fireAndForget(
          () => syncCustomerToCloud(newCustomer),
          get().setSyncStatus,
        );
      },
      updateCustomer: (id, c) =>
        set((s) => ({
          customers: s.customers.map((x) => (x.id === id ? { ...x, ...c } : x)),
        })),
      deleteCustomer: (id) => {
        set((s) => ({
          customers: s.customers.filter((x) => x.id !== id),
          emiPayments: s.emiPayments.filter((e) => e.customerId !== id),
        }));
        fireAndForget(() => deleteCustomerFromCloud(id), get().setSyncStatus);
      },

      addUser: (u) => {
        const newUser: User = { ...u, id: crypto.randomUUID() };
        set((s) => ({ users: [...s.users, newUser] }));
        // Sync agent accounts to cloud (not admin)
        if (newUser.role === "agent") {
          fireAndForget(
            () => syncAgentToCloud(userToAgentAccount(newUser)),
            get().setSyncStatus,
          );
        }
      },
      updateUser: (id, u) => {
        set((s) => ({
          users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)),
          currentUser:
            s.currentUser?.id === id
              ? { ...s.currentUser, ...u }
              : s.currentUser,
        }));
        // Sync if agent
        const updated = get().users.find((x) => x.id === id);
        if (updated && updated.role === "agent") {
          fireAndForget(
            () => syncAgentToCloud(userToAgentAccount(updated)),
            get().setSyncStatus,
          );
        }
      },
      deleteUser: (id) => {
        const userToDelete = get().users.find((x) => x.id === id);
        set((s) => ({ users: s.users.filter((x) => x.id !== id) }));
        if (userToDelete && userToDelete.role === "agent") {
          fireAndForget(() => deleteAgentFromCloud(id), get().setSyncStatus);
        }
      },

      addEMIPayment: (e) => {
        const newEMI: EMIPayment = {
          ...e,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ emiPayments: [...s.emiPayments, newEMI] }));
        fireAndForget(() => syncEMIToCloud(newEMI), get().setSyncStatus);
      },
      updateEMIPayment: (id, amount) => {
        set((s) => ({
          emiPayments: s.emiPayments.map((e) =>
            e.id === id ? { ...e, amount } : e,
          ),
        }));
        const updated = get().emiPayments.find((e) => e.id === id);
        if (updated) {
          fireAndForget(() => syncEMIToCloud(updated), get().setSyncStatus);
        }
      },
      deleteEMIPayment: (id) => {
        set((s) => ({ emiPayments: s.emiPayments.filter((e) => e.id !== id) }));
        fireAndForget(() => deleteEMIFromCloud(id), get().setSyncStatus);
      },

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

      saveReport: (r) =>
        set((s) => ({
          savedReports: [
            {
              ...r,
              id: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
            },
            ...s.savedReports,
          ],
        })),
      deleteSavedReport: (id) =>
        set((s) => ({
          savedReports: s.savedReports.filter((r) => r.id !== id),
        })),

      restoreFromBackup: (data) =>
        set((s) => ({
          customers: data.customers ?? s.customers,
          emiPayments: data.emiPayments ?? s.emiPayments,
          lineCategories: data.lineCategories ?? s.lineCategories,
          reportCustomFields: data.reportCustomFields ?? s.reportCustomFields,
          savedReports: data.savedReports ?? s.savedReports,
        })),

      loadAgentsPreLogin: async () => {
        try {
          const remoteAgents = await loadAgentAccounts();
          if (remoteAgents.length === 0) return;
          set((s) => {
            // Keep admin accounts, replace all agents with cloud version
            const admins = s.users.filter((u) => u.role === "admin");
            const cloudAgents: User[] = remoteAgents.map((a) => ({
              id: a.id,
              username: a.username,
              password: a.password,
              role: "agent" as const,
              assignedLines: a.assignedLines,
            }));
            return { users: [...admins, ...cloudAgents] };
          });
        } catch {
          // best-effort
        }
      },

      loadCloudData: async () => {
        const { setSyncStatus } = get();
        setSyncStatus("syncing");
        try {
          const [
            { customers: remoteCustomers, emiPayments: remoteEMIs },
            remoteLineCategories,
            remoteAgents,
          ] = await Promise.all([
            loadFromCloud(),
            loadLineCategories(),
            loadAgentAccounts(),
          ]);

          set((s) => {
            // Merge customers: remote wins for existing IDs, add new ones
            const localCustomerIds = new Set(s.customers.map((c) => c.id));
            const merged = [...s.customers];
            for (const rc of remoteCustomers) {
              if (localCustomerIds.has(rc.id)) {
                const idx = merged.findIndex((c) => c.id === rc.id);
                if (idx !== -1) merged[idx] = rc as unknown as Customer;
              } else {
                merged.push(rc as unknown as Customer);
              }
            }

            // Merge EMIs: remote wins for existing IDs, add new ones
            const localEMIIds = new Set(s.emiPayments.map((e) => e.id));
            const mergedEMIs = [...s.emiPayments];
            for (const re of remoteEMIs) {
              if (localEMIIds.has(re.id)) {
                const idx = mergedEMIs.findIndex((e) => e.id === re.id);
                if (idx !== -1) mergedEMIs[idx] = re as unknown as EMIPayment;
              } else {
                mergedEMIs.push(re as unknown as EMIPayment);
              }
            }

            // Line categories: cloud overwrites local if cloud has data
            const lineCategories =
              remoteLineCategories.length > 0
                ? (remoteLineCategories as unknown as LineCategory[])
                : s.lineCategories;

            // Agents: cloud overwrites local agents (admin stays)
            const admins = s.users.filter((u) => u.role === "admin");
            const cloudAgents: User[] =
              remoteAgents.length > 0
                ? remoteAgents.map((a) => ({
                    id: a.id,
                    username: a.username,
                    password: a.password,
                    role: "agent" as const,
                    assignedLines: a.assignedLines,
                  }))
                : s.users.filter((u) => u.role === "agent");

            // Update currentUser if it's an agent that was updated
            let updatedCurrentUser = s.currentUser;
            if (s.currentUser && s.currentUser.role === "agent") {
              const refreshed = cloudAgents.find(
                (a) => a.id === s.currentUser?.id,
              );
              if (refreshed) updatedCurrentUser = refreshed;
            }

            return {
              customers: merged,
              emiPayments: mergedEMIs,
              lineCategories,
              users: [...admins, ...cloudAgents],
              currentUser: updatedCurrentUser,
            };
          });

          setSyncStatus("synced");
        } catch {
          setSyncStatus("error");
        }
      },
    }),
    {
      name: "finance-pro-store",
      partialize: (state) => {
        // Don't persist syncStatus
        const { syncStatus: _syncStatus, ...rest } = state;
        return rest;
      },
    },
  ),
);
