# Finance Pro - Cloud Sync (Customers + EMIs)

## Current State
All data is stored in browser localStorage via Zustand persist middleware. No backend data models exist - the Motoko backend only has authorization code. All features (bilingual UI, roles, reports, Excel export, validation, etc.) work locally.

## Requested Changes (Diff)

### Add
- Motoko backend with two simple data stores: customers and EMI payments
- Auto-sync: after every addCustomer / deleteCustomer / addEMIPayment / updateEMIPayment / deleteEMIPayment call, push changes to backend
- On app startup (after login), load customers and EMI payments from the backend and merge with local (by ID, prefer remote for conflicts)
- A `syncStatus` indicator in the UI (small "Syncing..." / "Synced" text in header)

### Modify
- `appStore.ts`: after each customer/EMI mutation, call backend actor to persist; on mount fetch customers+EMIs from backend
- `package.json`: ensure `xlsx` stays in dependencies

### Remove
- Nothing removed

## Implementation Plan
1. Generate minimal Motoko backend: Customer and EMIPayment types matching frontend, stable vars for storage, CRUD functions (addCustomer, getCustomers, deleteCustomer, addEMIPayment, getEMIPayments, updateEMIPayment, deleteEMIPayment)
2. Create a `cloudSync.ts` utility that wraps backend actor calls
3. Update `appStore.ts` to call cloud sync after each customer/EMI mutation and load from cloud on init
4. Add a small sync status indicator to the Header
5. Keep all other features (line categories, users, reports, settings, Excel export) in local storage unchanged
