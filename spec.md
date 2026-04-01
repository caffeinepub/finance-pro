# Finance Pro

## Current State
Reports tab has Report Generation with Reminder card and Save Report button. SavedReport type has reminder, savedAt, savedBy etc. Saved report cards show date, line, collection, lending, reminder.

## Requested Changes (Diff)

### Add
- actualAmount (number) and amountStatus ('shortage'|'high'|'ok') fields on SavedReport
- Actual Amount input between Reminder card and Save button
- Inline warning: Shortage if actual < reminder, High if actual > reminder, nothing if equal
- Warning icon on saved report cards for shortage/high status
- Labels in en + ta

### Modify
- handleSaveReport to include actualAmount and amountStatus
- Saved report cards to show warning badge
- View modal to show Actual Amount

### Remove
- Nothing

## Implementation Plan
1. Add optional actualAmount and amountStatus to SavedReport in types.ts
2. Add labels to labels.ts
3. ReportsPage: add state, input, live warning, pass to saveReport
4. Cards: show warning icon when status is shortage/high
5. Modal: show Actual Amount row
