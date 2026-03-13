import type {
  AgentAccount,
  Customer,
  EMIPayment,
  LineCategory,
  backendInterface,
} from "../backend";
import { createActorWithConfig } from "../config";

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

export async function syncAgentToCloud(agent: AgentAccount): Promise<void> {
  try {
    const actor = await getActor();
    await actor.addOrUpdateAgentAccount(agent);
  } catch {
    // best-effort; silently swallow
  }
}

export async function deleteAgentFromCloud(id: string): Promise<void> {
  try {
    const actor = await getActor();
    await actor.deleteAgentAccount(id);
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
