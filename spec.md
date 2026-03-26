# Finance Pro

## Current State
UpdateEmiPage.tsx validates amount, date, and EMI lock but does NOT check if the customer loan is already closed (outstanding <= 0).

## Requested Changes (Diff)

### Add
- Label key loanAlreadyClosed in labels.ts (en + ta)
- Validation in handleSave: if outstanding <= 0, show error and return

### Modify
- labels.ts: add loanAlreadyClosed label
- UpdateEmiPage.tsx: add closed-loan guard in handleSave

### Remove
- Nothing

## Implementation Plan
1. Add loanAlreadyClosed to labels.ts for both languages
2. Add check in UpdateEmiPage.tsx handleSave before saving EMI
