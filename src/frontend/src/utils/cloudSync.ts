import type {
  AgentAccount,
  CloudSavedReport,
  Customer,
  EMIPayment,
  LineCategory,
  backendInterface,
} from "../backend";
import { createActorWithConfig } from "../config";
import type {
  EMIPaymentMeta,
  SavedReport,
  SavedReportField,
} from "../store/types";
import type {
  Customer as StoreCustomer,
  EMIPayment as StoreEMIPayment,
} from "../store/types";

let actorCache: backendInterface | null = null;

async function getActor(): Promise<backendInterface> {
  if (!actorCache) {
    actorCache = await createActorWithConfig();
  }
  return actorCache;
}

export async function syncCustomerToCloud(
  customer: StoreCustomer,
): Promise<void> {
  try {
    const actor = await getActor();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { addedAt, ...cloudCustomer } = customer;
    await actor.addOrUpdateCustomer(cloudCustomer as Customer);
    // Persist addedAt timestamp separately
    if (addedAt) {
      const existing = await actor.getCustomerTimestamps();
      const updated: Array<[string, string]> = [
        ...existing.filter(([id]) => id !== customer.id),
        [customer.id, addedAt],
      ];
      await actor.setCustomerTimestamps(updated);
    }
  } catch {
    // best-effort; silently swallow
  }
}

export async function deleteCustomerFromCloud(id: string): Promise<void> {
  try {
    const actor = await getActor();
    await actor.deleteCustomer(id);
  } catch {
    // best-effort; silently swallow
  }
}

export async function syncEMIToCloud(payment: StoreEMIPayment): Promise<void> {
  try {
    const actor = await getActor();
    // Strip payment method fields — those are stored in emiPaymentMeta separately
    const { paymentMethod, cashAmount, transferAmount, ...basePayment } =
      payment;
    await actor.addOrUpdateEMIPayment(basePayment as EMIPayment);
  } catch {
    // best-effort; silently swallow
  }
}

export async function deleteEMIFromCloud(id: string): Promise<void> {
  try {
    const actor = await getActor();
    await actor.deleteEMIPayment(id);
    await actor.deleteEMIPaymentMeta(id);
  } catch {
    // best-effort; silently swallow
  }
}

export async function syncLineCategoriesToCloud(
  categories: LineCategory[],
): Promise<void> {
  try {
    const actor = await getActor();
    await actor.setLineCategories(categories);
  } catch {
    // best-effort; silently swallow
  }
}

export async function loadLineCategories(): Promise<LineCategory[]> {
  try {
    const actor = await getActor();
    return await actor.getLineCategories();
  } catch {
    return [];
  }
}

// Agent Accounts — bulk replace, same pattern as line categories
export async function syncAllAgentsToCloud(
  agents: AgentAccount[],
): Promise<void> {
  try {
    const actor = await getActor();
    await actor.setAgentAccounts(agents);
  } catch {
    // best-effort; silently swallow
  }
}

export async function loadAgentAccounts(): Promise<AgentAccount[]> {
  try {
    const actor = await getActor();
    return await actor.getAgentAccounts();
  } catch {
    return [];
  }
}

export async function loadFromCloud(): Promise<{
  customers: StoreCustomer[];
  emiPayments: StoreEMIPayment[];
}> {
  try {
    const actor = await getActor();
    const [cloudCustomers, emiPayments, timestampEntries] = await Promise.all([
      actor.getCustomers(),
      actor.getEMIPayments(),
      actor.getCustomerTimestamps(),
    ]);
    // Build a lookup map: customerId -> addedAt ISO string
    const tsMap = new Map<string, string>(timestampEntries);
    const customers: StoreCustomer[] = cloudCustomers.map((c) => ({
      ...c,
      loanType: c.loanType as StoreCustomer["loanType"],
      addedAt: tsMap.get(c.id),
    }));
    return { customers, emiPayments };
  } catch {
    return { customers: [], emiPayments: [] };
  }
}

// Saved Reports
// We encode actualCash, actualBank, amountStatus into dynLeftJson as a special
// metadata wrapper: { "fields": [...], "meta": { actualCash, actualBank, amountStatus } }
// This avoids any backend schema changes while preserving all actual amount data.
export function savedReportToCloud(r: SavedReport): CloudSavedReport {
  const dynLeftWrapped = JSON.stringify({
    fields: r.dynLeft,
    meta: {
      actualCash: r.actualCash ?? 0,
      actualBank: r.actualBank ?? 0,
      actualAmount: r.actualAmount ?? 0,
      amountStatus: r.amountStatus ?? "ok",
    },
  });
  return {
    id: r.id,
    reportDate: r.reportDate,
    lineName: r.lineName,
    preAmount: r.preAmount,
    collection: r.collection,
    loanFee: r.loanFee,
    lending: r.lending,
    expense: r.expense,
    dynLeftJson: dynLeftWrapped,
    dynRightJson: JSON.stringify(r.dynRight),
    leftTotal: r.leftTotal,
    rightTotal: r.rightTotal,
    reminder: r.reminder,
    savedAt: r.savedAt,
    savedBy: r.savedBy,
  };
}

export function cloudToSavedReport(c: CloudSavedReport): SavedReport {
  let dynLeft: SavedReportField[] = [];
  let dynRight: SavedReportField[] = [];
  let actualCash: number | undefined;
  let actualBank: number | undefined;
  let actualAmount: number | undefined;
  let amountStatus: "shortage" | "high" | "ok" | undefined;

  try {
    const parsed = JSON.parse(c.dynLeftJson);
    // Detect wrapped format: { fields: [...], meta: {...} }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.fields)) {
      dynLeft = parsed.fields;
      if (parsed.meta) {
        actualCash =
          typeof parsed.meta.actualCash === "number"
            ? parsed.meta.actualCash
            : undefined;
        actualBank =
          typeof parsed.meta.actualBank === "number"
            ? parsed.meta.actualBank
            : undefined;
        actualAmount =
          typeof parsed.meta.actualAmount === "number"
            ? parsed.meta.actualAmount
            : undefined;
        amountStatus = parsed.meta.amountStatus as
          | "shortage"
          | "high"
          | "ok"
          | undefined;
      }
    } else if (Array.isArray(parsed)) {
      // Legacy format: plain array
      dynLeft = parsed;
    }
  } catch {
    dynLeft = [];
  }

  try {
    dynRight = JSON.parse(c.dynRightJson);
  } catch {
    dynRight = [];
  }

  return {
    id: c.id,
    reportDate: c.reportDate,
    lineName: c.lineName,
    preAmount: c.preAmount,
    collection: c.collection,
    loanFee: c.loanFee,
    lending: c.lending,
    expense: c.expense,
    dynLeft,
    dynRight,
    leftTotal: c.leftTotal,
    rightTotal: c.rightTotal,
    reminder: c.reminder,
    savedAt: c.savedAt,
    savedBy: c.savedBy,
    actualCash,
    actualBank,
    actualAmount,
    amountStatus,
  };
}

export async function syncSavedReportToCloud(
  report: SavedReport,
): Promise<void> {
  try {
    const actor = await getActor();
    await actor.addOrUpdateSavedReport(savedReportToCloud(report));
  } catch {
    // best-effort
  }
}

export async function deleteSavedReportFromCloud(
  lineName: string,
  reportDate: string,
): Promise<void> {
  try {
    const actor = await getActor();
    // Cloud key is lineName:reportDate
    await actor.deleteSavedReport(`${lineName}:${reportDate}`);
  } catch {
    // best-effort
  }
}

export async function loadSavedReports(): Promise<SavedReport[]> {
  try {
    const actor = await getActor();
    const reports = await actor.getSavedReports();
    return reports.map(cloudToSavedReport);
  } catch {
    return [];
  }
}

// EMI Payment Meta — stored in a separate stable map on the backend
export async function syncEMIMetaToCloud(
  emiId: string,
  meta: EMIPaymentMeta,
): Promise<void> {
  try {
    const actor = await getActor();
    await actor.setEMIPaymentMeta(emiId, meta);
  } catch {
    // best-effort
  }
}

export async function loadEMIPaymentMeta(): Promise<
  Array<[string, EMIPaymentMeta]>
> {
  try {
    const actor = await getActor();
    const result = await actor.getEMIPaymentMeta();
    return result as Array<[string, EMIPaymentMeta]>;
  } catch {
    return [];
  }
}

export async function syncEMIMetaBulkToCloud(
  entries: Array<[string, EMIPaymentMeta]>,
): Promise<void> {
  try {
    const actor = await getActor();
    await actor.setEMIPaymentMetaBulk(entries);
  } catch {
    // best-effort
  }
}

/**
 * Upload ALL local data to cloud in one shot using bulk-replace methods.
 * Each data type is sent as a single canister call — same reliable pattern as
 * setLineCategories / setAgentAccounts. Returns true on success, false on error.
 * Always resets the actor cache before attempting to avoid stale connections.
 * Retries up to 3 times with a 2-second delay between attempts.
 */
export async function uploadAllLocalDataToCloud(params: {
  customers: StoreCustomer[];
  emiPayments: StoreEMIPayment[];
  lineCategories: LineCategory[];
  agents: AgentAccount[];
  savedReports: SavedReport[];
  lockedLines?: string[];
  emiPaymentMeta?: Array<[string, EMIPaymentMeta]>;
}): Promise<boolean> {
  // Always reset cache to force fresh actor — avoids stale/broken connection
  actorCache = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const actor = await getActor();
      // Strip addedAt from customer objects before sending to cloud
      const cloudCustomers: Customer[] = params.customers.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { addedAt, ...rest } = c;
        return rest as Customer;
      });
      // Build timestamp entries from customers that have addedAt
      const timestampEntries: Array<[string, string]> = params.customers
        .filter((c) => c.addedAt)
        .map((c) => [c.id, c.addedAt!]);

      // Strip payment method fields from EMI payments before sending to cloud
      const cloudEMIPayments: EMIPayment[] = params.emiPayments.map((e) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { paymentMethod, cashAmount, transferAmount, ...basePayment } = e;
        return basePayment as EMIPayment;
      });

      await actor.setCustomers(cloudCustomers);
      await actor.setEMIPayments(cloudEMIPayments);
      await actor.setLineCategories(params.lineCategories);
      await actor.setAgentAccounts(params.agents);
      await actor.setSavedReports(params.savedReports.map(savedReportToCloud));
      await actor.setCustomerTimestamps(timestampEntries);
      if (params.lockedLines !== undefined) {
        await actor.setLockedLines(params.lockedLines);
      }
      if (
        params.emiPaymentMeta !== undefined &&
        params.emiPaymentMeta.length > 0
      ) {
        await actor.setEMIPaymentMetaBulk(params.emiPaymentMeta);
      }
      return true;
    } catch {
      actorCache = null; // reset on failure so next attempt gets fresh actor
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

// Locked Lines — cloud sync
// Returns null on error (to distinguish from "admin intentionally unlocked all lines")
export async function loadLockedLines(): Promise<string[] | null> {
  try {
    const actor = await getActor();
    return await actor.getLockedLines();
  } catch {
    // Return null so the caller can keep the existing lock state
    // instead of silently wiping all locks on a network error
    return null;
  }
}

export async function syncLockedLinesToCloud(lines: string[]): Promise<void> {
  try {
    const actor = await getActor();
    await actor.setLockedLines(lines);
  } catch {
    // best-effort; silently swallow
  }
}
