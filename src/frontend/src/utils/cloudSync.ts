import type { Customer, EMIPayment, backendInterface } from "../backend";
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
