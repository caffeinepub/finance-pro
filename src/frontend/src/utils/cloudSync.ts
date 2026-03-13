import type {
  AgentAccount,
  CloudSavedReport,
  Customer,
  EMIPayment,
  LineCategory,
  backendInterface,
} from "../backend";
import { createActorWithConfig } from "../config";
import type { SavedReport, SavedReportField } from "../store/types";

let actorCache: backendInterface | null = null;

async function getActor(): Promise<backendInterface> {
  if (!actorCache) {
    actorCache = await createActorWithConfig();
  }
  return actorCache;
}

export async function syncCustomerToCloud(customer: Customer): Promise<void> {
  try {
    const actor = await getActor();
    await actor.addOrUpdateCustomer(customer);
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

export async function syncEMIToCloud(payment: EMIPayment): Promise<void> {
  try {
    const actor = await getActor();
    await actor.addOrUpdateEMIPayment(payment);
  } catch {
    // best-effort; silently swallow
  }
}

export async function deleteEMIFromCloud(id: string): Promise<void> {
  try {
    const actor = await getActor();
    await actor.deleteEMIPayment(id);
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
  customers: Customer[];
  emiPayments: EMIPayment[];
}> {
  try {
    const actor = await getActor();
    const [customers, emiPayments] = await Promise.all([
      actor.getCustomers(),
      actor.getEMIPayments(),
    ]);
    return { customers, emiPayments };
  } catch {
    return { customers: [], emiPayments: [] };
  }
}

// Saved Reports
export function savedReportToCloud(r: SavedReport): CloudSavedReport {
  return {
    id: r.id,
    reportDate: r.reportDate,
    lineName: r.lineName,
    preAmount: r.preAmount,
    collection: r.collection,
    loanFee: r.loanFee,
    lending: r.lending,
    expense: r.expense,
    dynLeftJson: JSON.stringify(r.dynLeft),
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
  try {
    dynLeft = JSON.parse(c.dynLeftJson);
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
