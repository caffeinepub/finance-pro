# Finance Pro

## Current State

- `ReportsPage.tsx` has two tabs: "Generate Report" and "Saved Reports"
- In the Generate Report tab, there are two action buttons at the bottom:
  - "Save Report" (saves to cloud)
  - "Export to Excel" (calls `exportReport()` which generates a 3-sheet Excel: Report summary, Customer Records, EMI History)
- The Saved Reports tab shows cards for each saved report sorted by date descending, with a delete button (admin only). No export functionality exists here.
- `excel.ts` has `exportReport(reportData, date, line, customers, lineCategories, emis)` function

## Requested Changes (Diff)

### Add
- New function `exportSavedReports(reports: SavedReport[], filterType: 'today' | 'range' | 'all', startDate?: string, endDate?: string)` in `excel.ts`
  - Produces a single-sheet Excel file
  - Row 1: headers — Date | Line | Pre Amount | Collection | Loan Fee | Lending | Expense | Reminder
  - Row 2+: one saved report per row
  - File named: `saved-reports-all.xlsx`, `saved-reports-today.xlsx`, or `saved-reports-YYYY-MM-DD-to-YYYY-MM-DD.xlsx`
- "Download Excel" button in Saved Reports tab, visible to admin only
  - Clicking it shows a small dropdown/popover menu with 3 options:
    1. Download Today — filters saved reports by today's date and exports
    2. Download Date Range — shows two date pickers (Start Date, End Date); after selecting, exports reports in that range
    3. Download All Records — exports all saved reports with no filter

### Modify
- In `ReportsPage.tsx`, Generate Report tab: remove the "Export to Excel" button entirely (remove `handleExport` function and the Download button). Only the "Save Report" button remains in the action row.

### Remove
- `handleExport` function in `ReportsPage.tsx`
- The Export to Excel Button in the Generate Report tab

## Implementation Plan

1. In `src/frontend/src/utils/excel.ts`, add a new `exportSavedReports` function:
   - Takes `reports: SavedReport[]` and `filterType: 'today' | 'range' | 'all'` and optional `startDate`, `endDate`
   - Filters the reports based on filterType/dates
   - Builds rows with columns: Date (DD-MM-YYYY), Line, Pre Amount, Collection, Loan Fee, Lending, Expense, Reminder
   - Uses `XLSX.utils.json_to_sheet` for tabular format (headers row 1, data rows 2+)
   - Generates a filename based on filter type

2. In `src/frontend/src/pages/ReportsPage.tsx`:
   - Remove `handleExport` function and `exportReport` import
   - Remove the Export to Excel button from the Generate Report tab (leave only Save Report button, now full-width)
   - In the Saved Reports tab, add a "Download Excel" button (admin only) at the top of the tab
   - The button opens a dropdown/popover with 3 options:
     - "Download Today": calls `exportSavedReports(visibleSavedReports, 'today')`
     - "Download Date Range": shows an inline date range picker (two date inputs); a "Download" confirm button triggers `exportSavedReports(visibleSavedReports, 'range', startDate, endDate)`
     - "Download All Records": calls `exportSavedReports(visibleSavedReports, 'all')`
   - Use a DropdownMenu (shadcn) for the 3 options
   - For "Download Date Range", show an inline date range UI (two date inputs + Download button) below the main button when selected

3. Add labels for new UI strings in `src/frontend/src/store/labels.ts`:
   - `downloadExcel`: "Download Excel" / Tamil equivalent
   - `downloadToday`: "Download Today" / Tamil equivalent
   - `downloadDateRange`: "Download Date Range" / Tamil equivalent
   - `downloadAll`: "Download All Records" / Tamil equivalent
   - `startDate`: "Start Date" / Tamil equivalent
   - `endDate`: "End Date" / Tamil equivalent
   - `download`: "Download" / Tamil equivalent
