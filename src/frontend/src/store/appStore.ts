import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  deleteCustomerFromCloud,
  deleteEMIFromCloud,
  deleteSavedReportFromCloud,
  loadAgentAccounts,
  loadEMIPaymentMeta,
  loadFromCloud,
  loadLineCategories,
  loadLockedLines,
  loadSavedReports,
  syncAllAgentsToCloud,
  syncCustomerToCloud,
  syncEMIMetaToCloud,
  syncEMIToCloud,
  syncLineCategoriesToCloud,
  syncLockedLinesToCloud,
  syncSavedReportToCloud,
  uploadAllLocalDataToCloud,
} from "../utils/cloudSync";
import type {
  AppState,
  Customer,
  EMIPayment,
  EMIPaymentMeta,
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
  isCloudLoaded: boolean;
  setSyncStatus: (status: SyncStatus) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setLanguage: (lang: "en" | "ta") => void;
  addLineCategory: (name: string) => void;
  updateLineCategory: (id: string, name: string) => void;
  deleteLineCategory: (id: string) => void;
  addCustomer: (
    c: Omit<Customer, "createdAt" | "createdBy"> & { loanDate?: string },
  ) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addUser: (u: Omit<User, "id">) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addEMIPayment: (e: Omit<EMIPayment, "id" | "createdAt">) => void;
  updateEMIPayment: (id: string, amount: number) => void;
  deleteEMIPayment: (id: string) => void;
  saveReportCustomField: (f: ReportCustomField) => void;
  deleteReportCustomField: (id: string) => void;
  saveReport: (r: Omit<SavedReport, "id" | "savedAt">) => void;
  deleteSavedReport: (id: string) => void;
  lockedLines: string[];
  lockLine: (lineName: string) => void;
  unlockLine: (lineName: string) => void;
  customerMedia: Record<string, { photoUrl: string; idProofUrls: string[] }>;
  setCustomerMedia: (
    customerId: string,
    media: { photoUrl: string; idProofUrls: string[] },
  ) => void;
  restoreFromBackup: (data: {
    customers?: Customer[];
    emiPayments?: EMIPayment[];
    lineCategories?: LineCategory[];
    reportCustomFields?: ReportCustomField[];
    savedReports?: SavedReport[];
  }) => Promise<boolean>;
  loadCloudData: () => Promise<void>;
  loadAgentsPreLogin: () => Promise<void>;
  uploadToCloud: () => Promise<boolean>;
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

/**
 * Build the full users list to sync to cloud.
 * Admin users are prefixed with __admin__ so they survive round-trips.
 * dashboardAccess is stored as Candid optional: [] means false/unset, [true] means enabled.
 */
// ENCODING RULE: dashboard access is stored as a special marker "__dash_on__"
// appended to assignedLines. This avoids changing the AgentAccount Motoko type
// (which would break stable variable deserialization on canister upgrade).
const DASH_MARKER = "__dash_on__";
function buildCloudUsersPayload(users: User[]) {
  return users.map((u) => ({
    id: u.role === "admin" ? `__admin__${u.id}` : u.id,
    username: u.username,
    password: u.password,
    assignedLines: [
      ...u.assignedLines,
      ...(u.dashboardEnabled ? [DASH_MARKER] : []),
    ],
  }));
}
function decodeCloudAgent(a: {
  id: string;
  username: string;
  password: string;
  assignedLines: string[];
}): User {
  return {
    id: a.id,
    username: a.username,
    password: a.password,
    role: "agent" as const,
    assignedLines: a.assignedLines.filter((l) => l !== DASH_MARKER),
    dashboardEnabled: a.assignedLines.includes(DASH_MARKER),
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Business data — NOT persisted to localStorage (always loaded from cloud)
      users: defaultUsers,
      lineCategories: defaultLineCategories,
      customers: [] as Customer[],
      emiPayments: [] as EMIPayment[],
      savedReports: [] as SavedReport[],
      lockedLines: [] as string[],
      customerMedia: {} as Record<
        string,
        { photoUrl: string; idProofUrls: string[] }
      >,

      // Local-only preferences — persisted to localStorage
      reportCustomFields: [] as ReportCustomField[],
      currentUser: null,
      language: "en" as "en" | "ta",

      syncStatus: "idle" as SyncStatus,
      isCloudLoaded: false,

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
      logout: () => set({ currentUser: null, isCloudLoaded: false }),
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
        const { loanDate, ...fields } = c as Omit<
          Customer,
          "createdAt" | "createdBy"
        > & { loanDate?: string };
        const newCustomer: Customer = {
          ...fields,
          id: fields.id ?? crypto.randomUUID(),
          createdAt: loanDate ?? new Date().toISOString().split("T")[0],
          addedAt: new Date().toISOString(),
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
        const allUsers = get().users;
        fireAndForget(
          () => syncAllAgentsToCloud(buildCloudUsersPayload(allUsers)),
          get().setSyncStatus,
        );
      },
      updateUser: (id, u) => {
        set((s) => ({
          users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)),
          currentUser:
            s.currentUser?.id === id
              ? { ...s.currentUser, ...u }
              : s.currentUser,
        }));
        const allUsers = get().users;
        fireAndForget(
          () => syncAllAgentsToCloud(buildCloudUsersPayload(allUsers)),
          get().setSyncStatus,
        );
      },
      deleteUser: (id) => {
        set((s) => ({ users: s.users.filter((x) => x.id !== id) }));
        const allUsers = get().users;
        fireAndForget(
          () => syncAllAgentsToCloud(buildCloudUsersPayload(allUsers)),
          get().setSyncStatus,
        );
      },

      addEMIPayment: (e) => {
        const newEMI: EMIPayment = {
          ...e,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ emiPayments: [...s.emiPayments, newEMI] }));
        fireAndForget(async () => {
          await syncEMIToCloud(newEMI);
          if (newEMI.paymentMethod) {
            await syncEMIMetaToCloud(newEMI.id, {
              paymentMethod: newEMI.paymentMethod,
              cashAmount: newEMI.cashAmount ?? 0,
              transferAmount: newEMI.transferAmount ?? 0,
            });
          }
        }, get().setSyncStatus);
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

      saveReport: (r) => {
        const newReport: SavedReport = {
          ...r,
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
        };
        set((s) => ({
          savedReports: [
            newReport,
            ...s.savedReports.filter(
              (x) =>
                !(x.lineName === r.lineName && x.reportDate === r.reportDate),
            ),
          ],
        }));
        get().lockLine(r.lineName);
        fireAndForget(
          () => syncSavedReportToCloud(newReport),
          get().setSyncStatus,
        );
      },

      deleteSavedReport: (id) => {
        const report = get().savedReports.find((r) => r.id === id);
        set((s) => ({
          savedReports: s.savedReports.filter((r) => r.id !== id),
        }));
        if (report) {
          fireAndForget(
            () =>
              deleteSavedReportFromCloud(report.lineName, report.reportDate),
            get().setSyncStatus,
          );
        }
      },

      lockLine: (lineName) => {
        const next = [...new Set([...get().lockedLines, lineName])];
        set({ lockedLines: next });
        fireAndForget(() => syncLockedLinesToCloud(next), get().setSyncStatus);
      },
      setCustomerMedia: (customerId, media) => {
        set((s) => ({
          customerMedia: { ...s.customerMedia, [customerId]: media },
        }));
      },
      unlockLine: (lineName) => {
        const next = get().lockedLines.filter((n) => n !== lineName);
        set({ lockedLines: next });
        fireAndForget(() => syncLockedLinesToCloud(next), get().setSyncStatus);
      },

      restoreFromBackup: async (data): Promise<boolean> => {
        // 1. Restore data to in-memory state
        set((s) => ({
          customers: data.customers ?? s.customers,
          emiPayments: data.emiPayments ?? s.emiPayments,
          lineCategories: data.lineCategories ?? s.lineCategories,
          reportCustomFields: data.reportCustomFields ?? s.reportCustomFields,
          savedReports: data.savedReports ?? s.savedReports,
          syncStatus: "syncing",
        }));

        // 2. Immediately push all restored data to cloud (bulk-replace)
        const state = get();
        const allUsers = buildCloudUsersPayload(state.users);

        // Build EMI payment meta from restored EMI payments
        const emiPaymentMeta: Array<[string, EMIPaymentMeta]> =
          state.emiPayments
            .filter((e) => e.paymentMethod)
            .map((e) => [
              e.id,
              {
                paymentMethod: e.paymentMethod!,
                cashAmount: e.cashAmount ?? 0,
                transferAmount: e.transferAmount ?? 0,
              },
            ]);

        const success = await uploadAllLocalDataToCloud({
          customers: state.customers,
          emiPayments: state.emiPayments,
          lineCategories: state.lineCategories,
          agents: allUsers,
          savedReports: state.savedReports,
          lockedLines: state.lockedLines,
          emiPaymentMeta,
        });

        get().setSyncStatus(success ? "synced" : "error");
        return success;
      },

      loadAgentsPreLogin: async () => {
        try {
          const remoteEntries = await loadAgentAccounts();
          if (remoteEntries.length === 0) return;

          const adminEntries = remoteEntries.filter((a) =>
            a.id.startsWith("__admin__"),
          );
          const agentEntries = remoteEntries.filter(
            (a) => !a.id.startsWith("__admin__"),
          );

          set((s) => {
            const updatedAdmins = s.users
              .filter((u) => u.role === "admin")
              .map((admin) => {
                const cloudAdmin = adminEntries.find(
                  (ae) => ae.id === `__admin__${admin.id}`,
                );
                if (cloudAdmin) {
                  return {
                    ...admin,
                    username: cloudAdmin.username,
                    password: cloudAdmin.password,
                  };
                }
                return admin;
              });

            const cloudAgents: User[] = agentEntries.map(decodeCloudAgent);

            return { users: [...updatedAdmins, ...cloudAgents] };
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
            remoteEntries,
            remoteSavedReports,
            remoteLockedLines,
            remoteEMIMeta,
          ] = await Promise.all([
            loadFromCloud(),
            loadLineCategories(),
            loadAgentAccounts(),
            loadSavedReports(),
            loadLockedLines(),
            loadEMIPaymentMeta(),
          ]);

          // Build a map from emiId -> meta for quick lookup
          const metaMap = new Map(
            remoteEMIMeta.map(([id, meta]) => [id, meta]),
          );

          // Deduplicate EMIs: keep only first entry per (customerId, paymentDate)
          let hadDuplicates = false;
          const deduplicatedEMIs = (() => {
            const rawEMIs = remoteEMIs as unknown as EMIPayment[];
            const seenKeys = new Set<string>();
            const result: EMIPayment[] = [];
            for (const e of rawEMIs) {
              const key = `${e.customerId}|${e.paymentDate}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                // Merge payment meta into the EMI object
                const emiWithMeta: EMIPayment = { ...e };
                const meta = metaMap.get(e.id);
                if (meta) {
                  emiWithMeta.paymentMethod =
                    meta.paymentMethod as EMIPayment["paymentMethod"];
                  emiWithMeta.cashAmount = meta.cashAmount;
                  emiWithMeta.transferAmount = meta.transferAmount;
                }
                result.push(emiWithMeta);
              }
            }
            hadDuplicates = rawEMIs.length !== result.length;
            return result;
          })();

          set((s) => {
            const customers = remoteCustomers as unknown as Customer[];
            const emiPayments = deduplicatedEMIs;
            const savedReports = remoteSavedReports as SavedReport[];

            const lineCategories =
              remoteLineCategories.length > 0
                ? (remoteLineCategories as unknown as LineCategory[])
                : s.lineCategories;

            const adminEntries = remoteEntries.filter((a) =>
              a.id.startsWith("__admin__"),
            );
            const agentEntries = remoteEntries.filter(
              (a) => !a.id.startsWith("__admin__"),
            );

            const admins = s.users
              .filter((u) => u.role === "admin")
              .map((admin) => {
                const cloudAdmin = adminEntries.find(
                  (ae) => ae.id === `__admin__${admin.id}`,
                );
                if (cloudAdmin) {
                  return {
                    ...admin,
                    username: cloudAdmin.username,
                    password: cloudAdmin.password,
                  };
                }
                return admin;
              });

            const cloudAgents: User[] =
              agentEntries.length > 0
                ? agentEntries.map(decodeCloudAgent)
                : s.users.filter((u) => u.role === "agent");

            let updatedCurrentUser = s.currentUser;
            if (s.currentUser) {
              if (s.currentUser.role === "agent") {
                const refreshed = cloudAgents.find(
                  (a) => a.id === s.currentUser?.id,
                );
                if (refreshed) updatedCurrentUser = refreshed;
              } else if (s.currentUser.role === "admin") {
                const refreshedAdmin = admins.find(
                  (a) => a.id === s.currentUser?.id,
                );
                if (refreshedAdmin) updatedCurrentUser = refreshedAdmin;
              }
            }

            return {
              customers,
              emiPayments,
              lineCategories,
              users: [...admins, ...cloudAgents],
              currentUser: updatedCurrentUser,
              savedReports,
              // Only update lockedLines if the cloud call succeeded (non-null).
              // null means the call failed — keep existing locks to prevent silent unlock.
              // [] means admin intentionally unlocked all lines — apply it.
              lockedLines:
                remoteLockedLines !== null ? remoteLockedLines : s.lockedLines,
              isCloudLoaded: true,
            };
          });

          setSyncStatus("synced");

          // If duplicates were found, re-sync the clean list to cloud
          if (hadDuplicates) {
            const state = get();
            const allUsers = buildCloudUsersPayload(state.users);
            const emiPaymentMeta: Array<[string, EMIPaymentMeta]> =
              state.emiPayments
                .filter((e) => e.paymentMethod)
                .map((e) => [
                  e.id,
                  {
                    paymentMethod: e.paymentMethod!,
                    cashAmount: e.cashAmount ?? 0,
                    transferAmount: e.transferAmount ?? 0,
                  },
                ]);
            fireAndForget(async () => {
              await uploadAllLocalDataToCloud({
                customers: state.customers,
                emiPayments: state.emiPayments,
                lineCategories: state.lineCategories,
                agents: allUsers,
                savedReports: state.savedReports,
                lockedLines: state.lockedLines,
                emiPaymentMeta,
              });
            }, setSyncStatus);
          }
        } catch {
          setSyncStatus("error");
          set({ isCloudLoaded: true }); // unblock loading screen even on error
        }
      },

      uploadToCloud: async (): Promise<boolean> => {
        const { setSyncStatus } = get();
        setSyncStatus("syncing");
        const state = get();
        const allUsers = buildCloudUsersPayload(state.users);

        // Build EMI payment meta from current state
        const emiPaymentMeta: Array<[string, EMIPaymentMeta]> =
          state.emiPayments
            .filter((e) => e.paymentMethod)
            .map((e) => [
              e.id,
              {
                paymentMethod: e.paymentMethod!,
                cashAmount: e.cashAmount ?? 0,
                transferAmount: e.transferAmount ?? 0,
              },
            ]);

        const success = await uploadAllLocalDataToCloud({
          customers: state.customers,
          emiPayments: state.emiPayments,
          lineCategories: state.lineCategories,
          agents: allUsers,
          savedReports: state.savedReports,
          lockedLines: state.lockedLines,
          emiPaymentMeta,
        });
        setSyncStatus(success ? "synced" : "error");
        return success;
      },
    }),
    {
      name: "finance-pro-store",
      // Only persist UI preferences and login session.
      // All business data (customers, EMIs, users, lineCategories, savedReports)
      // is intentionally excluded — cloud is the single source of truth.
      partialize: (state) => ({
        language: state.language,
        currentUser: state.currentUser,
        reportCustomFields: state.reportCustomFields,
        customerMedia: state.customerMedia,
      }),
    },
  ),
);
