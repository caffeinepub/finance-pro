import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Download, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAlert } from "../components/AlertPopup";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";
import type { SavedReport } from "../store/types";
import { formatDate } from "../utils/dateFormat";
import { exportSavedReports } from "../utils/excel";
import { formatINR } from "../utils/formatINR";

interface DynField {
  id: string;
  label: string;
  value: string;
}

export default function ReportsPage() {
  const {
    customers,
    emiPayments,
    lineCategories,
    language,
    currentUser,
    savedReports,
    saveReport,
    deleteSavedReport,
  } = useAppStore();
  const t = labels[language];
  const today = new Date().toISOString().split("T")[0];
  const { showAlert, AlertComponent } = useAlert(language);

  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  const defaultLineId =
    visibleLineCategories.length > 0 ? visibleLineCategories[0].id : "";

  const [reportDate, setReportDate] = useState(today);
  const [lineId, setLineId] = useState(defaultLineId);
  const [preAmount, setPreAmount] = useState("");
  const [expense, setExpense] = useState("");
  const [dynLeft, setDynLeft] = useState<DynField[]>([]);
  const [dynRight, setDynRight] = useState<DynField[]>([]);
  const [viewReport, setViewReport] = useState<SavedReport | null>(null);
  const [showDateRange, setShowDateRange] = useState(false);
  const [dlStartDate, setDlStartDate] = useState("");
  const [dlEndDate, setDlEndDate] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [actualBank, setActualBank] = useState("");

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (isAgent && !assignedLines.includes(c.lineCategoryId)) return false;
      if (lineId && c.lineCategoryId !== lineId) return false;
      return true;
    });
  }, [customers, lineId, isAgent, assignedLines]);

  const filteredEmis = useMemo(() => {
    return emiPayments.filter((e) =>
      filteredCustomers.some((c) => c.id === e.customerId),
    );
  }, [emiPayments, filteredCustomers]);

  const collection = useMemo(() => {
    return filteredEmis
      .filter((e) => e.paymentDate === reportDate)
      .reduce((s, e) => s + e.amount, 0);
  }, [filteredEmis, reportDate]);

  const cashBreakdown = useMemo(() => {
    const todayEmis = filteredEmis.filter((e) => e.paymentDate === reportDate);
    const fromCash = todayEmis
      .filter((e) => !e.paymentMethod || e.paymentMethod === "cash")
      .reduce((s, e) => s + e.amount, 0);
    const fromSplitCash = todayEmis
      .filter((e) => e.paymentMethod === "split")
      .reduce((s, e) => s + (e.cashAmount ?? 0), 0);
    return fromCash + fromSplitCash;
  }, [filteredEmis, reportDate]);

  const accountBreakdown = useMemo(() => {
    const todayEmis = filteredEmis.filter((e) => e.paymentDate === reportDate);
    const fromAccount = todayEmis
      .filter((e) => e.paymentMethod === "account")
      .reduce((s, e) => s + e.amount, 0);
    const fromSplitAccount = todayEmis
      .filter((e) => e.paymentMethod === "split")
      .reduce((s, e) => s + (e.transferAmount ?? 0), 0);
    return fromAccount + fromSplitAccount;
  }, [filteredEmis, reportDate]);

  const loanFee = useMemo(() => {
    return filteredCustomers
      .filter((c) => c.createdAt === reportDate)
      .reduce((s, c) => s + (c.loanFee ?? 0), 0);
  }, [filteredCustomers, reportDate]);

  const lending = useMemo(() => {
    return filteredCustomers
      .filter((c) => c.createdAt === reportDate)
      .reduce((s, c) => s + c.loanAmount, 0);
  }, [filteredCustomers, reportDate]);

  const leftTotal =
    (Number(preAmount) || 0) +
    collection +
    loanFee +
    dynLeft.reduce((s, f) => s + (Number(f.value) || 0), 0);
  const rightTotal =
    lending +
    (Number(expense) || 0) +
    dynRight.reduce((s, f) => s + (Number(f.value) || 0), 0);
  const reminder = leftTotal - rightTotal;

  const actualCashNum = Number(actualCash) || 0;
  const actualBankNum = Number(actualBank) || 0;
  const actualAmountNum = actualCashNum + actualBankNum;
  const amountStatus =
    actualCash === "" && actualBank === ""
      ? null
      : actualAmountNum < reminder
        ? "shortage"
        : actualAmountNum > reminder
          ? "high"
          : "ok";

  const addDynLeft = () =>
    setDynLeft((f) => [
      ...f,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  const addDynRight = () =>
    setDynRight((f) => [
      ...f,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  const updateDynLeft = (id: string, k: "label" | "value", v: string) =>
    setDynLeft((f) => f.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const updateDynRight = (id: string, k: "label" | "value", v: string) =>
    setDynRight((f) => f.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  const currentLineName =
    lineCategories.find((l) => l.id === lineId)?.name ?? lineId;

  const handleSaveReport = () => {
    // Check for duplicate: same line + same date
    const duplicate = savedReports.some(
      (r) => r.reportDate === reportDate && r.lineName === currentLineName,
    );
    if (duplicate) {
      showAlert(t.reportAlreadySaved, "error");
      return;
    }

    saveReport({
      reportDate,
      lineName: currentLineName,
      preAmount: Number(preAmount) || 0,
      collection,
      loanFee,
      lending,
      expense: Number(expense) || 0,
      dynLeft: dynLeft.map((f) => ({
        label: f.label || "Custom",
        value: Number(f.value) || 0,
      })),
      dynRight: dynRight.map((f) => ({
        label: f.label || "Custom",
        value: Number(f.value) || 0,
      })),
      leftTotal,
      rightTotal,
      reminder,
      savedBy: currentUser?.username ?? "",
      actualAmount: actualAmountNum,
      actualCash: actualCashNum,
      actualBank: actualBankNum,
      amountStatus: amountStatus ?? "ok",
    });
    showAlert(t.reportSaved, "success");
  };

  const assignedLineNames = visibleLineCategories.map((l) => l.name);
  const visibleSavedReports = (
    isAgent
      ? savedReports.filter((r) => assignedLineNames.includes(r.lineName))
      : [...savedReports]
  ).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  return (
    <div data-ocid="reports.page" className="space-y-4">
      {AlertComponent}
      <Tabs defaultValue="generate" data-ocid="reports.tab">
        <TabsList className="w-full">
          <TabsTrigger
            value="generate"
            className="flex-1"
            data-ocid="reports.generate_tab"
          >
            {t.reports}
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="flex-1"
            data-ocid="reports.saved_tab"
          >
            {t.savedReports}
          </TabsTrigger>
        </TabsList>

        {/* GENERATE REPORT TAB */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t.date}</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                data-ocid="reports.date_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.lineCategory}</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger
                  className="text-xs"
                  data-ocid="reports.line_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleLineCategories.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* LEFT */}
            <Card>
              <CardContent className="px-3 pb-3 pt-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t.preAmount}
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    value={preAmount}
                    onChange={(e) => setPreAmount(e.target.value)}
                    data-ocid="reports.pre_amount_input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t.collection}
                  </Label>
                  <Input
                    className="h-8 text-xs bg-muted"
                    value={formatINR(collection)}
                    readOnly
                    data-ocid="reports.collection_input"
                  />
                  {(cashBreakdown > 0 || accountBreakdown > 0) && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {t.cashCollection}: {formatINR(cashBreakdown)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        &bull;
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t.accountCollection}: {formatINR(accountBreakdown)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t.loanFee}
                  </Label>
                  <Input
                    className="h-8 text-xs bg-muted"
                    value={formatINR(loanFee)}
                    readOnly
                    data-ocid="reports.loan_fee_input"
                  />
                </div>
                {dynLeft.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Label"
                      value={f.label}
                      onChange={(e) =>
                        updateDynLeft(f.id, "label", e.target.value)
                      }
                    />
                    <div className="flex gap-1">
                      <Input
                        className="h-7 text-xs"
                        type="number"
                        placeholder="Amount"
                        value={f.value}
                        onChange={(e) =>
                          updateDynLeft(f.id, "value", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDynLeft((fl) => fl.filter((x) => x.id !== f.id))
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={addDynLeft}
                  data-ocid="reports.add_left_button"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t.addField}
                </Button>
                <div className="text-xs font-semibold text-right border-t pt-1">
                  Total: {formatINR(leftTotal)}
                </div>
              </CardContent>
            </Card>

            {/* RIGHT */}
            <Card>
              <CardContent className="px-3 pb-3 pt-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t.lending}
                  </Label>
                  <Input
                    className="h-8 text-xs bg-muted"
                    value={formatINR(lending)}
                    readOnly
                    data-ocid="reports.lending_input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t.expense}
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    value={expense}
                    onChange={(e) => setExpense(e.target.value)}
                    data-ocid="reports.expense_input"
                  />
                </div>
                {dynRight.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Label"
                      value={f.label}
                      onChange={(e) =>
                        updateDynRight(f.id, "label", e.target.value)
                      }
                    />
                    <div className="flex gap-1">
                      <Input
                        className="h-7 text-xs"
                        type="number"
                        placeholder="Amount"
                        value={f.value}
                        onChange={(e) =>
                          updateDynRight(f.id, "value", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDynRight((fl) => fl.filter((x) => x.id !== f.id))
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={addDynRight}
                  data-ocid="reports.add_right_button"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t.addField}
                </Button>
                <div className="text-xs font-semibold text-right border-t pt-1">
                  Total: {formatINR(rightTotal)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card
            className={`border-2 ${
              reminder >= 0 ? "border-emerald-500" : "border-destructive"
            }`}
            data-ocid="reports.reminder_card"
          >
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{t.reminder}</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  reminder >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {formatINR(reminder)}
              </p>
            </CardContent>
          </Card>

          {/* Actual Amount Field - Cash + Bank split */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.actualAmount}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t.actualCash}
                </Label>
                <Input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                  data-ocid="reports.actual_cash_input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t.actualBank}
                </Label>
                <Input
                  type="number"
                  value={actualBank}
                  onChange={(e) => setActualBank(e.target.value)}
                  placeholder="0"
                  data-ocid="reports.actual_bank_input"
                />
              </div>
            </div>
            {(actualCash !== "" || actualBank !== "") && (
              <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted border text-sm">
                <span className="text-muted-foreground font-medium">
                  {t.actualAmount}:
                </span>
                <span className="font-bold">{formatINR(actualAmountNum)}</span>
              </div>
            )}
            {amountStatus === "shortage" && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-red-50 border border-red-300 text-red-700"
                data-ocid="reports.shortage_warning"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {t.shortageWarning}
              </div>
            )}
            {amountStatus === "high" && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-amber-50 border border-amber-300 text-amber-700"
                data-ocid="reports.high_warning"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {t.highWarning}
              </div>
            )}
            {amountStatus === "ok" && (
              <p className="text-sm text-emerald-600 font-medium">
                {t.amountMatchesReminder}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveReport}
            data-ocid="reports.save_button"
          >
            <Save className="h-4 w-4 mr-2" />
            {t.saveReport}
          </Button>
        </TabsContent>

        {/* SAVED REPORTS TAB */}
        <TabsContent value="saved" className="space-y-3 mt-4">
          {/* Download Excel - Admin only */}
          {!isAgent && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mb-3"
                    data-ocid="reports.download_excel_button"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t.downloadExcel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem
                    onClick={() =>
                      exportSavedReports(visibleSavedReports, "today")
                    }
                  >
                    {t.downloadToday}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDateRange(!showDateRange)}
                  >
                    {t.downloadDateRange}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportSavedReports(visibleSavedReports, "all")
                    }
                  >
                    {t.downloadAll}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {showDateRange && (
                <div className="flex flex-col gap-2 p-3 border rounded-lg mb-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t.startDate}</Label>
                      <Input
                        type="date"
                        value={dlStartDate}
                        onChange={(e) => setDlStartDate(e.target.value)}
                        className="h-8 text-xs"
                        data-ocid="reports.start_date_input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.endDate}</Label>
                      <Input
                        type="date"
                        value={dlEndDate}
                        onChange={(e) => setDlEndDate(e.target.value)}
                        className="h-8 text-xs"
                        data-ocid="reports.end_date_input"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      exportSavedReports(
                        visibleSavedReports,
                        "range",
                        dlStartDate,
                        dlEndDate,
                      );
                      setShowDateRange(false);
                    }}
                    disabled={!dlStartDate || !dlEndDate}
                    data-ocid="reports.download_range_button"
                  >
                    <Download className="h-3 w-3 mr-1" /> {t.download}
                  </Button>
                </div>
              )}
            </>
          )}

          {visibleSavedReports.length === 0 ? (
            <div
              className="text-center text-muted-foreground py-10 text-sm"
              data-ocid="reports.saved_reports.empty_state"
            >
              {t.noSavedReports}
            </div>
          ) : (
            visibleSavedReports.map((r, idx) => (
              <Card
                key={r.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                data-ocid={`reports.saved_reports.item.${idx + 1}`}
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-left flex-1"
                      onClick={() => setViewReport(r)}
                    >
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {formatDate(r.reportDate)} — {r.lineName}
                        {(r.amountStatus === "shortage" ||
                          r.amountStatus === "high") && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              r.amountStatus === "shortage"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {r.amountStatus === "shortage"
                              ? "Shortage"
                              : "High"}
                          </span>
                        )}
                      </CardTitle>
                    </button>
                    <div className="flex items-center gap-1">
                      {!isAgent && (
                        <button
                          type="button"
                          className="text-destructive p-1"
                          data-ocid={`reports.saved_reports.delete_button.${idx + 1}`}
                          onClick={() => deleteSavedReport(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.savedAt).toLocaleString()} · {r.savedBy}
                  </p>
                </CardHeader>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setViewReport(r)}
                >
                  <CardContent className="p-3 pt-0">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          {t.collection}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatINR(r.collection)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t.lending}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatINR(r.lending)}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`font-semibold ${
                            r.reminder >= 0
                              ? "text-emerald-600"
                              : "text-destructive"
                          }`}
                        >
                          {t.reminder}: {formatINR(r.reminder)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* View Report Detail Dialog */}
      {viewReport && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          data-ocid="reports.view_report.modal"
        >
          <div className="bg-background rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">
                  {formatDate(viewReport.reportDate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewReport.lineName}
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground text-lg font-bold"
                data-ocid="reports.view_report.close_button"
                onClick={() => setViewReport(null)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Left side */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Income
                  </p>
                  <RowItem label={t.preAmount} value={viewReport.preAmount} />
                  <RowItem label={t.collection} value={viewReport.collection} />
                  <RowItem label={t.loanFee} value={viewReport.loanFee} />
                  {viewReport.dynLeft.map((f) => (
                    <RowItem
                      key={`left-${f.label}`}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                  <div className="border-t pt-1">
                    <RowItem label="Total" value={viewReport.leftTotal} bold />
                  </div>
                </div>
                {/* Right side */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Expense
                  </p>
                  <RowItem label={t.lending} value={viewReport.lending} />
                  <RowItem label={t.expense} value={viewReport.expense} />
                  {viewReport.dynRight.map((f) => (
                    <RowItem
                      key={`right-${f.label}`}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                  <div className="border-t pt-1">
                    <RowItem label="Total" value={viewReport.rightTotal} bold />
                  </div>
                </div>
              </div>
              <div
                className={`rounded-xl p-3 text-center ${
                  viewReport.reminder >= 0
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p className="text-xs text-muted-foreground">{t.reminder}</p>
                <p
                  className={`text-2xl font-bold ${
                    viewReport.reminder >= 0
                      ? "text-emerald-600"
                      : "text-destructive"
                  }`}
                >
                  {formatINR(viewReport.reminder)}
                </p>
              </div>

              {/* Actual Amount section in modal */}
              {viewReport.actualAmount !== undefined &&
                viewReport.actualAmount > 0 && (
                  <div className="space-y-2">
                    <div
                      className={`rounded-xl p-3 border ${
                        viewReport.amountStatus === "shortage"
                          ? "bg-red-50 border-red-200"
                          : viewReport.amountStatus === "high"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      {/* Total Actual Amount */}
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          {t.actualAmount}
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            viewReport.amountStatus === "shortage"
                              ? "text-red-700"
                              : viewReport.amountStatus === "high"
                                ? "text-amber-700"
                                : "text-emerald-600"
                          }`}
                        >
                          {formatINR(viewReport.actualAmount)}
                        </p>
                      </div>
                      {/* Cash / Bank breakdown */}
                      {(viewReport.actualCash !== undefined ||
                        viewReport.actualBank !== undefined) && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-current/10">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              {t.actualCash}
                            </p>
                            <p className="text-sm font-semibold">
                              {formatINR(viewReport.actualCash ?? 0)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              {t.actualBank}
                            </p>
                            <p className="text-sm font-semibold">
                              {formatINR(viewReport.actualBank ?? 0)}
                            </p>
                          </div>
                        </div>
                      )}
                      {(viewReport.amountStatus === "shortage" ||
                        viewReport.amountStatus === "high") && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <AlertTriangle
                            className={`h-3.5 w-3.5 ${
                              viewReport.amountStatus === "shortage"
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          />
                          <p
                            className={`text-xs font-medium ${
                              viewReport.amountStatus === "shortage"
                                ? "text-red-700"
                                : "text-amber-700"
                            }`}
                          >
                            {viewReport.amountStatus === "shortage"
                              ? t.shortageWarning
                              : t.highWarning}
                          </p>
                        </div>
                      )}
                      {viewReport.amountStatus === "ok" && (
                        <p className="text-xs text-emerald-600 mt-1">
                          {t.amountMatchesReminder}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              <p className="text-xs text-center text-muted-foreground">
                Saved by {viewReport.savedBy} ·{" "}
                {new Date(viewReport.savedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowItem({
  label,
  value,
  bold,
}: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span
        className={`text-muted-foreground ${
          bold ? "font-semibold text-foreground" : ""
        }`}
      >
        {label}
      </span>
      <span className={bold ? "font-bold" : "font-medium"}>
        {formatINR(value)}
      </span>
    </div>
  );
}
