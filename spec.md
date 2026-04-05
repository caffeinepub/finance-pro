# Finance Pro

## Current State

- `UpdateEmiPage.tsx`: Shows all customers for a selected line (including Closed/Completed loans). Has Paid/Unpaid tags, line selector, search. After selecting a customer shows Loan Repay Amount and Outstanding Balance in a summary card.
- `RecordsPage.tsx`: Shows customer cards with name, serial, line, loan type, date, loan amount, paid amount, outstanding amount, and a status badge (Active/Completed). No dues count shown on cards.
- `calculations.ts`: Has `loanStatus()` which returns `"Active"` | `"Completed"` based on outstanding > 0. Has `paidAmount()` counting total EMI payments per customer.
- `types.ts`: `Customer.loanType` is `"Pre"` | `"Post"`. `EMIPayment` has `customerId` for linking.

## Requested Changes (Diff)

### Add
- **Dues display on Records tab customer cards**: Show `"Due: X/10"` (Post) or `"Due: X/14"` (Pre) on each card, visible without opening the detail view. X = number of EMI entries for that customer.
- **Dues display in Update EMI after customer selection**: Below the Outstanding Balance field in the selected customer summary card, show `"Dues: X/10"` or `"Dues: X/14"`.

### Modify
- **Update EMI customer list**: Filter out customers whose loan status is `"Completed"` (outstanding <= 0). Currently they are shown in the list (blocked at save time). Change the filter so `lineCustomers` and `filtered` lists exclude closed/completed loan customers entirely.

### Remove
- Nothing removed.

## Implementation Plan

1. **UpdateEmiPage.tsx**:
   - In `lineCustomers` filter, add `&& outstandingAmount(c, emiPayments) > 0` to exclude completed/closed loans.
   - In the search `baseForSearch` / `filtered` logic, also filter out closed loans.
   - In the selected customer summary card, add a dues row below the Outstanding Balance: compute `duesPaid = emiPayments.filter(e => e.customerId === selected.id).length` and `duesTotal = selected.loanType === 'Post' ? 10 : 14`, display `"Dues: {duesPaid}/{duesTotal}"`.

2. **RecordsPage.tsx**:
   - On each customer card, compute `duesPaid = emiPayments.filter(e => e.customerId === c.id).length` and `duesTotal = c.loanType === 'Post' ? 10 : 14`.
   - Display `"Due: {duesPaid}/{duesTotal}"` on the card itself (below the loan type/date line or in the stats grid), visible without tapping.
   - The sorted filtered list already excludes nothing (shows all including Closed) -- keep that behavior for Records; only Update EMI hides closed loans.
