# Finance Pro

## Current State
Version 36 is live. Cloud sync works for customers, EMI payments, and line categories via an ICP Motoko backend. Agent accounts (username, password, assigned lines) are stored only in local browser storage. Admin account is local-only. Login checks the local users array.

## Requested Changes (Diff)

### Add
- `AgentAccount` type in Motoko backend with id, username, password, assignedLines fields
- `addOrUpdateAgentAccount`, `getAgentAccounts`, `deleteAgentAccount` Motoko functions
- `AgentAccount` interface in `backend.d.ts`
- `syncAgentToCloud`, `deleteAgentFromCloud`, `loadAgentAccounts` in `cloudSync.ts`
- `loadAgentsPreLogin` action in appStore that fetches agents from cloud and merges into users (replaces all agents, keeps admin)
- App startup effect in `App.tsx` to call `loadAgentsPreLogin` on mount (before login)

### Modify
- `appStore.ts`: `addUser`, `updateUser`, `deleteUser` now fire cloud sync after mutation (agents only, not admin)
- `appStore.ts`: `loadCloudData` also fetches and merges agent accounts from cloud (cloud overwrites local agents)
- `backend.d.ts`: add AgentAccount interface and three new methods to backendInterface

### Remove
- Nothing removed

## Implementation Plan
1. Update `src/backend/main.mo` — add AgentAccount type and three CRUD functions
2. Update `src/frontend/src/backend.d.ts` — add AgentAccount interface + three methods
3. Update `src/frontend/src/utils/cloudSync.ts` — add agent sync/load functions
4. Update `src/frontend/src/store/appStore.ts` — wire addUser/updateUser/deleteUser to cloud sync; update loadCloudData; add loadAgentsPreLogin
5. Update `src/frontend/src/App.tsx` — call loadAgentsPreLogin on mount
