import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";
import { exportReport } from "../utils/excel";

interface DynField {
  id: string;
  label: string;
  value: string;
}

export default function ReportsPage() {
  const { customers, emiPayments, lineCategories, language, currentUser } =
    useAppStore();
  const t = labels[language];
  const today = new Date().toISOString().split("T")[0];

  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  // Agents only see their assigned lines; no "All" option for agents
  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  const [reportDate, setReportDate] = useState(today);
  const [lineId, setLineId] = useState(
    isAgent && assignedLines.length > 0 ? assignedLines[0] : "all",
  );
  const [preAmount, setPreAmount] = useState("");
  const [expense, setExpense] = useState("");
  const [dynLeft, setDynLeft] = useState<DynField[]>([]);
  const [dynRight, setDynRight] = useState<DynField[]>([]);

  const filteredCustomers = useMemo(() => {
    const linesToFilter = isAgent ? assignedLines : null;
    return customers.filter((c) => {
      if (linesToFilter && !linesToFilter.includes(c.lineCategoryId))
        return false;
      if (!isAgent && lineId !== "all" && c.lineCategoryId !== lineId)
        return false;
      if (isAgent && lineId !== "all" && c.lineCategoryId !== lineId)
        return false;
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

  // Loan Fee = sum of loanFee recorded on selected date for selected line
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

  const handleExport = () => {
    const lineName = lineCategories.find((l) => l.id === lineId)?.name ?? "All";
    const data: Record<string, number | string> = {
      Date: reportDate,
      Line: lineName,
      [t.preAmount]: Number(preAmount) || 0,
      [t.collection]: collection,
      [t.loanFee]: loanFee,
      ...Object.fromEntries(
        dynLeft.map((f) => [f.label || "Custom Left", Number(f.value) || 0]),
      ),
      [t.lending]: lending,
      [t.expense]: Number(expense) || 0,
      ...Object.fromEntries(
        dynRight.map((f) => [f.label || "Custom Right", Number(f.value) || 0]),
      ),
      [t.reminder]: reminder,
    };
    exportReport(
      data,
      reportDate,
      lineName,
      filteredCustomers,
      lineCategories,
      filteredEmis,
    );
  };

  return (
    <div data-ocid="reports.page" className="space-y-4">
      <h2 className="text-lg font-bold">{t.reports}</h2>

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
            <SelectTrigger className="text-xs" data-ocid="reports.line_select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!isAgent && <SelectItem value="all">{t.all}</SelectItem>}
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
                value={`₹${collection.toLocaleString()}`}
                readOnly
                data-ocid="reports.collection_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">
                {t.loanFee}
              </Label>
              <Input
                className="h-8 text-xs bg-muted"
                value={`₹${loanFee.toLocaleString()}`}
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
                  onChange={(e) => updateDynLeft(f.id, "label", e.target.value)}
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
              Total: ₹{leftTotal.toLocaleString()}
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
                value={`₹${lending.toLocaleString()}`}
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
              Total: ₹{rightTotal.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        className={`border-2 ${reminder >= 0 ? "border-emerald-500" : "border-destructive"}`}
        data-ocid="reports.reminder_card"
      >
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t.reminder} / மீதி இருப்பு
          </p>
          <p
            className={`text-3xl font-bold mt-1 ${reminder >= 0 ? "text-emerald-600" : "text-destructive"}`}
          >
            ₹{reminder.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleExport}
        data-ocid="reports.export_button"
      >
        <Download className="h-4 w-4 mr-2" />
        {t.exportExcel}
      </Button>
    </div>
  );
}
