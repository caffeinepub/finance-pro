import * as XLSX from "xlsx";
import {
  loanRepayAmount,
  loanStatus,
  outstandingAmount,
  paidAmount,
} from "../store/calculations";
import type { Customer, EMIPayment, LineCategory } from "../store/types";

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export function exportCustomers(
  customers: Customer[],
  lineCategories: LineCategory[],
  emis: EMIPayment[],
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customer records
  const customerData = customers.map((c) => ({
    "Serial No": c.serialNumber,
    "Loan Date": fmtDate(c.createdAt),
    Name: c.name,
    Phone: c.phone,
    Address: c.address,
    Line: lineCategories.find((l) => l.id === c.lineCategoryId)?.name ?? "",
    "Loan Amount": c.loanAmount,
    "Loan Type": c.loanType,
    "Interest %": c.loanInterest,
    "Loan Fee": c.loanFee ?? 0,
    "Repay Amount": loanRepayAmount(c),
    "Paid Amount": paidAmount(c.id, emis),
    Outstanding: outstandingAmount(c, emis),
    Status: loanStatus(c, emis),
  }));
  const ws1 = XLSX.utils.json_to_sheet(customerData);
  XLSX.utils.book_append_sheet(wb, ws1, "Customers");

  // Sheet 2: EMI History
  const emiData = emis
    .slice()
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    .map((e) => {
      const c = customers.find((x) => x.id === e.customerId);
      return {
        Date: fmtDate(e.paymentDate),
        "Serial No": c?.serialNumber ?? "",
        "Customer Name": c?.name ?? "",
        Line:
          lineCategories.find((l) => l.id === c?.lineCategoryId)?.name ?? "",
        "EMI Amount": e.amount,
        "Recorded By": e.recordedBy,
      };
    });
  const ws2 = XLSX.utils.json_to_sheet(
    emiData.length
      ? emiData
      : [
          {
            Date: "",
            "Serial No": "",
            "Customer Name": "",
            Line: "",
            "EMI Amount": "",
            "Recorded By": "",
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, ws2, "EMI History");

  XLSX.writeFile(wb, "customers.xlsx");
}

export function exportEMIs(
  emis: EMIPayment[],
  customers: Customer[],
  lineCategories: LineCategory[],
) {
  const data = emis.map((e) => {
    const c = customers.find((x) => x.id === e.customerId);
    return {
      Date: fmtDate(e.paymentDate),
      Customer: c?.name ?? "",
      Serial: c?.serialNumber ?? "",
      Line: lineCategories.find((l) => l.id === c?.lineCategoryId)?.name ?? "",
      Amount: e.amount,
      "Recorded By": e.recordedBy,
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "EMI Records");
  XLSX.writeFile(wb, "emi-records.xlsx");
}

export function exportReport(
  reportData: Record<string, number | string>,
  date: string,
  line: string,
  customers: Customer[],
  lineCategories: LineCategory[],
  emis: EMIPayment[],
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Report summary
  const rows = Object.entries(reportData).map(([k, v]) => ({
    Field: k,
    Value: v,
  }));
  const ws1 = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws1, "Report");

  // Sheet 2: Customer Records for the selected line/date filter
  const customerData = customers.map((c) => ({
    "Serial No": c.serialNumber,
    "Loan Date": fmtDate(c.createdAt),
    Name: c.name,
    Phone: c.phone,
    Address: c.address,
    Line: lineCategories.find((l) => l.id === c.lineCategoryId)?.name ?? "",
    "Loan Amount": c.loanAmount,
    "Loan Type": c.loanType,
    "Interest %": c.loanInterest,
    "Loan Fee": c.loanFee ?? 0,
    "Repay Amount": loanRepayAmount(c),
    "Paid Amount": paidAmount(c.id, emis),
    Outstanding: outstandingAmount(c, emis),
    Status: loanStatus(c, emis),
  }));
  const ws2 = XLSX.utils.json_to_sheet(
    customerData.length ? customerData : [{}],
  );
  XLSX.utils.book_append_sheet(wb, ws2, "Customer Records");

  // Sheet 3: EMI History for the selected line/date filter
  const emiData = emis
    .slice()
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    .map((e) => {
      const c = customers.find((x) => x.id === e.customerId);
      return {
        Date: fmtDate(e.paymentDate),
        "Serial No": c?.serialNumber ?? "",
        "Customer Name": c?.name ?? "",
        Line:
          lineCategories.find((l) => l.id === c?.lineCategoryId)?.name ?? "",
        "EMI Amount": e.amount,
        "Recorded By": e.recordedBy,
      };
    });
  const ws3 = XLSX.utils.json_to_sheet(
    emiData.length
      ? emiData
      : [
          {
            Date: "",
            "Serial No": "",
            "Customer Name": "",
            Line: "",
            "EMI Amount": "",
            "Recorded By": "",
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, ws3, "EMI History");

  XLSX.writeFile(wb, `report-${date}-${line}.xlsx`);
}
