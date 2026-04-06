# Finance Pro

## Current State

Line locks are stored as a flat `string[]` of line names (`lockedLines`) in `appStore.ts`. There is no timestamp, auto-unlock date, or lock reason stored. The backend stores locked lines as `[Text]` via `setLockedLines`/`getLockedLines`. Auto-lock happens in `saveReport` by calling `lockLine(lineName)`. Admin can manually lock/unlock from Settings. Agents are blocked in AddEntryPage and UpdateEmiPage when `lockedLines.includes(lineName)` is true.

## Requested Changes (Diff)

### Add
- New `LineLockEntry` type: `{ lineName: string; autoUnlockDate: string | null }` — where `autoUnlockDate` is a YYYY-MM-DD date string (IST), or `null` if no auto-unlock (manual lock with no report)
- New `lineLocksDetailed: LineLockEntry[]` store field replacing the current flat `lockedLines: string[]`
- Auto-unlock logic: on every app load and on every action that checks lock state, if today's date (IST) >= `autoUnlockDate`, the line is automatically unlocked (removed from store + synced to cloud)
- Auto-unlock date = report's `reportDate` + 7 days (e.g. report date 2026-04-06 → auto-unlock 2026-04-13 00:00 IST)
- When a report is saved for a line already locked: do NOT reset `autoUnlockDate` — keep the original value
- When admin manually unlocks: remove entry entirely from `lineLocksDetailed`, cancel auto-unlock
- When admin manually locks (no report exists for that line): add entry with `autoUnlockDate: null` (indefinite lock)
- When admin manually locks (report exists): add entry with `autoUnlockDate` calculated from last saved report date for that line
- Backend: replace `setLockedLines([Text])` / `getLockedLines()` with `setLineLocksDetailed(json: Text)` / `getLineLocksDetailed()` that stores a JSON-encoded array of `LineLockEntry`
- Alternatively (simpler): keep existing `setLockedLines`/`getLockedLines` but encode as JSON strings `"lineName|autoUnlockDate"` or store a new separate stable variable — use a new backend method `setLineLocks(json: Text)` / `getLineLocks()` storing full JSON
- Lock message shown to agents changes: if `autoUnlockDate` exists → "This line is locked until DD-MM-YYYY. Contact admin to unlock early." ; if `autoUnlockDate` is null → "This line is locked by admin. Contact admin to unlock."
- Settings > Lines: for each locked line, show "Locked until DD-MM-YYYY" (or "Locked indefinitely") next to the lock toggle
- For admin role, show "Next Auto-unlock: DD-MM-YYYY" in line category settings section

### Modify
- `appStore.ts`: replace `lockedLines: string[]` with `lineLocksDetailed: LineLockEntry[]`. Keep computed `lockedLines` getter or inline the `.map(e => e.lineName)` where needed
- `lockLine(lineName)`: now takes optional `autoUnlockDate?: string | null`. If locking due to report save, pass `reportDate + 7 days`. If manual lock with no report, pass `null`. If line already locked (report saved again), do NOT update existing entry
- `unlockLine(lineName)`: removes entry from `lineLocksDetailed`
- `saveReport` in `appStore.ts`: call `lockLine(lineName, computedAutoUnlockDate)` where `computedAutoUnlockDate = addDays(reportDate, 7)` in YYYY-MM-DD format. If line already in `lineLocksDetailed`, do NOT update existing auto-unlock date
- `cloudSync.ts`: `loadLockedLines` → `loadLineLocks` returns `LineLockEntry[] | null`; `syncLockedLinesToCloud` → `syncLineLocksToCloud` sends JSON
- `AddEntryPage.tsx` and `UpdateEmiPage.tsx`: update lock check to use `lineLocksDetailed` and show unlock date in message
- `SettingsPage.tsx`: show unlock date next to each locked line's toggle
- Backend `main.mo`: add `setLineLocks(json: Text)` and `getLineLocks()` stable methods alongside (or replacing) the existing ones to store detailed lock info as JSON string
- Auto-unlock check: run on `loadCloudData()` completion and when `lineLocksDetailed` is accessed — filter out entries where `autoUnlockDate` is not null and `autoUnlockDate <= todayIST()`

### Remove
- `lockedLines: string[]` flat array from store (replace with `lineLocksDetailed`)
- Old backend `setLockedLines`/`getLockedLines` can remain for backward compat but new code uses `setLineLocks`/`getLineLocks`

## Implementation Plan

1. **Backend (`main.mo`)**: Add `stable var stableLineLocks : Text = "[]"` and `setLineLocks(json: Text)` / `getLineLocks()` query. Keep old `setLockedLines`/`getLockedLines` for backward compatibility.
2. **Types**: Add `LineLockEntry { lineName: string; autoUnlockDate: string | null }` type
3. **Helper**: `getTodayIST()` returns YYYY-MM-DD string for current IST date. `addDaysToDate(dateStr, days)` returns new YYYY-MM-DD string
4. **`appStore.ts`**: Replace `lockedLines: string[]` with `lineLocksDetailed: LineLockEntry[]`. Update `lockLine`, `unlockLine`, `saveReport`, `loadCloudData` accordingly. Add `checkAndApplyAutoUnlocks()` that filters expired locks and syncs if any were removed
5. **`cloudSync.ts`**: Add `loadLineLocks()` and `syncLineLocksToCloud()` using the new backend methods
6. **`AddEntryPage.tsx`**: Update lock check + message to show unlock date
7. **`UpdateEmiPage.tsx`**: Update lock check + message to show unlock date
8. **`SettingsPage.tsx`**: Update Lines section to display "Locked until DD-MM-YYYY" or "Locked indefinitely" and "Next Auto-unlock" label
9. **Auto-unlock trigger**: Called on app startup (after `loadCloudData`) and each time an action checks locks
