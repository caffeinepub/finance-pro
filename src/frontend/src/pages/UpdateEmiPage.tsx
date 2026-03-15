import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useAlert } from "../components/AlertPopup";
import { useAppStore } from "../store/appStore";
import {
  loanRepayAmount,
  outstandingAmount,
  paidAmount,
} from "../store/calculations";
import { labels } from "../store/labels";
import type { Customer, EMIPayment } from "../store/types";
import { formatDate } from "../utils/dateFormat";
import { formatINR } from "../utils/formatINR";

export default function UpdateEmiPage() {
  const {
    customers,
    emiPayments,
    lineCategories,
    addEMIPayment,
    updateEMIPayment,
    language,
    currentUser,
  } = useAppStore();
  const t = labels[language];
  const { showAlert, AlertComponent } = useAlert(language);
  const today = new Date().toISOString().split("T")[0];
  const isAdmin = currentUser?.role === "admin";
  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const accessibleCustomers = isAgent
    ? customers.filter((c) => assignedLines.includes(c.lineCategoryId))
    : customers;

  const filtered =
    search.trim().length < 1
      ? []
      : accessibleCustomers.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
            c.address.toLowerCase().includes(search.toLowerCase()),
        );

  const customerEmis = (customerId: string) =>
    emiPayments
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const handleSave = () => {
    if (!selected) return;
    if (!amount || Number(amount) <= 0) {
      showAlert(t.enterValidAmount, "error");
      return;
    }
    if (date !== today) {
      showAlert(t.invalidDate, "error");
      return;
    }
    const exists = emiPayments.find(
      (e) => e.customerId === selected.id && e.paymentDate === date,
    );
    if (exists) {
      showAlert(t.alreadyPaid, "error");
      return;
    }
    addEMIPayment({
      customerId: selected.id,
      amount: Number(amount),
      paymentDate: date,
      recordedBy: currentUser?.username ?? "admin",
    });
    showAlert(t.emiSaved, "success");
    setAmount("");
  };

  const handleEdit = (e: EMIPayment) => {
    setEditId(e.id);
    setEditAmount(String(e.amount));
  };

  const handleEditSave = (id: string) => {
    updateEMIPayment(id, Number(editAmount));
    setEditId(null);
    showAlert(t.emiUpdated, "success");
  };

  return (
    <div data-ocid="update_emi.page" className="space-y-4">
      {AlertComponent}
      <h2 className="text-lg font-bold">{t.updateEmi}</h2>
      <div className="space-y-1">
        <Label className="text-xs">{t.searchCustomer}</Label>
        <Input
          placeholder={t.searchCustomer}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
          data-ocid="update_emi.search_input"
        />
      </div>

      {filtered.length > 0 && !selected && (
        <Card data-ocid="update_emi.customer_list">
          <CardContent className="p-0 divide-y divide-border">
            {filtered.map((c, i) => {
              const line = lineCategories.find(
                (l) => l.id === c.lineCategoryId,
              );
              return (
                <button
                  type="button"
                  key={c.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => setSelected(c)}
                  data-ocid={`update_emi.customer_item.${i + 1}`}
                >
                  <p className="font-medium text-sm">
                    {c.name}{" "}
                    <span className="text-muted-foreground">
                      #{c.serialNumber}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {line?.name} &bull; {c.address}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {selected && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {
                      lineCategories.find(
                        (l) => l.id === selected.lineCategoryId,
                      )?.name
                    }
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setSelected(null)}
                >
                  Change
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">
                    {t.loanRepayAmount}:
                  </span>{" "}
                  <span className="font-medium">
                    {formatINR(loanRepayAmount(selected))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t.outstandingAmount}:
                  </span>{" "}
                  <span className="font-medium text-amber-600">
                    {formatINR(outstandingAmount(selected, emiPayments))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Record EMI Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t.amount}</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-ocid="update_emi.amount_input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.date}</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    readOnly={true}
                    disabled={true}
                    data-ocid="update_emi.date_input"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                data-ocid="update_emi.submit_button"
              >
                {t.saveEmi}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.emiHistory}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customerEmis(selected.id).length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No EMI records yet
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {customerEmis(selected.id).map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between px-4 py-2.5"
                      data-ocid={`update_emi.emi_item.${i + 1}`}
                    >
                      <div>
                        <p className="text-sm">{formatDate(e.paymentDate)}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.recordedBy}
                        </p>
                      </div>
                      {editId === e.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(ev) => setEditAmount(ev.target.value)}
                            className="h-7 w-24 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditSave(e.id)}
                            className="p-1 text-emerald-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="p-1 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {formatINR(e.amount)}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleEdit(e)}
                              className="text-muted-foreground hover:text-foreground"
                              data-ocid={`update_emi.edit_button.${i + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
