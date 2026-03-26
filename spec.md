# Finance Pro

## Current State
Finance Pro is a cloud-only PWA for lending/finance businesses. Saved reports are stored per line category + date. Agents can currently update EMIs for any customer on their assigned lines at any time.

## Requested Changes (Diff)

### Add
- EMI lock enforcement in UpdateEmiPage: when an agent attempts to save an EMI for a customer whose line category has a saved report for today's date, block the action with a popup: "EMI update not allowed. Report already submitted for [Line Name] today."
- `unlockedReportLines: string[]` state in appStore -- list of `lineName|YYYY-MM-DD` keys admin has explicitly unlocked. Persisted in localStorage.
- `unlockReportLine(key: string)` and `lockReportLine(key: string)` actions in appStore.
- Admin lock/unlock toggle button in Saved Reports list (ReportsPage) -- visible only to admin, only for reports dated today.
- New labels: `emiBlockedByReport`, `unlockLine`, `lockLine` in both en and ta.

### Modify
- UpdateEmiPage handleSave: if agent, check if line is locked before saving.
- ReportsPage Saved Reports list: add lock/unlock icon button for admin on today's reports.

### Remove
- Nothing.

## Implementation Plan
1. Add unlockedReportLines state + actions to appStore with localStorage persistence.
2. Add label keys to labels.ts.
3. Update UpdateEmiPage handleSave to check lock.
4. Update ReportsPage Saved Reports list for admin lock/unlock UI.
