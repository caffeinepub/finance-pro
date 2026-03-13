# Finance Pro

## Current State
Saved reports are stored only in local browser storage (zustand persist). Customers, EMIs, and line categories are cloud-synced via ICP Motoko backend. Saved reports are not synced — each device has its own report history.

## Requested Changes (Diff)

### Add
- `SavedReport` type in Motoko backend with fields: id, reportDate, lineName, preAmount, collection, loanFee, lending, expense, dynLeftJson (JSON text), dynRightJson (JSON text), leftTotal, rightTotal, reminder, savedAt, savedBy
- Backend key: `lineName:reportDate` — last write overwrites (same line+date = overwrite)
- Backend methods: `addOrUpdateSavedReport`, `getSavedReports`, `deleteSavedReport`
- cloudSync.ts: `syncSavedReportToCloud`, `deleteSavedReportFromCloud`, `loadSavedReports`

### Modify
- `main.mo`: add SavedReport stable storage, map, pre/postupgrade hooks, and CRUD methods
- `backend.did.js` and `backend.did.d.ts`: add SavedReport type and three new methods
- `appStore.ts`: saveReport triggers cloud sync; deleteSavedReport triggers cloud delete; loadCloudData loads saved reports from cloud (cloud overwrites local, filtered by assigned lines for agents)

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo` to add SavedReport type + stable storage + CRUD methods (key = lineName:reportDate for last-write-wins)
2. Update Candid IDL files (backend.did.js, backend.did.d.ts) with SavedReport type and methods
3. Update cloudSync.ts with saved report sync/load functions
4. Update appStore.ts: saveReport syncs to cloud, deleteSavedReport deletes from cloud, loadCloudData also loads saved reports and merges (cloud overwrites local for same id)
