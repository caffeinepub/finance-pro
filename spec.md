# Finance Pro

## Current State
AddEntryPage.tsx has a form with fields: Line Category, Loan Date, Serial Number, Phone, Customer Name, Address, Loan Amount, Loan Interest, Loan Fee, Loan Type. All fields are filled manually every time.

## Requested Changes (Diff)

### Add
- After Line Category is selected, show a "Search existing customer" input/dropdown in AddEntryPage that filters customers belonging to the selected line category by name.
- When a customer is selected from the search results, auto-fill: Serial Number, Customer Name, Phone, and Address fields.
- Loan Amount, Loan Interest, Loan Fee, Loan Date, and Loan Type remain blank (these are loan-specific and should be entered fresh for the new loan).
- The search is optional — user can still type all fields manually without using it.
- Bilingual label support (English/Tamil).

### Modify
- AddEntryPage.tsx: add customer search/autofill UI after line category field.

### Remove
- Nothing.

## Implementation Plan
1. In AddEntryPage.tsx, after Line Category field, add an optional "Search & autofill customer" section.
2. Filter `customers` from store by selected `lineCategoryId`.
3. Show a text input that filters those customers by name (case-insensitive).
4. Show dropdown list of matches; on selection, fill name, phone, address, serialNumber.
5. Add bilingual labels for the search field.
6. The autofill section only appears once a line category is selected.
