import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store/appStore";
import {
  loanRepayAmount,
  loanStatus,
  outstandingAmount,
  paidAmount,
} from "../store/calculations";
import { labels } from "../store/labels";
import { formatDate } from "../utils/dateFormat";
import { exportCustomers } from "../utils/excel";
import { formatINR } from "../utils/formatINR";

export default function RecordsPage() {
  const {
    customers,
    emiPayments,
    lineCategories,
    language,
    currentUser,
    deleteCustomer,
  } = useAppStore();
  const t = labels[language];
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  const isAgent = currentUser?.role === "agent";
  const isAdmin = currentUser?.role === "admin";
  const assignedLines = currentUser?.assignedLines ?? [];

  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  const accessibleCustomers = isAgent
    ? customers.filter((c) => assignedLines.includes(c.lineCategoryId))
    : customers;

  const filtered = accessibleCustomers
    .filter((c) => {
      const matchLine = lineFilter === "all" || c.lineCategoryId === lineFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.serialNumber.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q);
      return matchLine && matchSearch;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const customerEmis = (id: string) =>
    emiPayments
      .filter((e) => e.customerId === id)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const handleDelete = (id: string, name: string) => {
    if (confirmDeleteId === id) {
      deleteCustomer(id);
      setConfirmDeleteId(null);
      setOpenDialogId(null);
      toast.success(
        language === "ta"
          ? `${name} நீக்கப்பட்டது`
          : `${name} deleted successfully`,
      );
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div data-ocid="records.page" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t.records}</h2>
        {!isAgent && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() =>
              exportCustomers(customers, lineCategories, emiPayments)
            }
          >
            <Download className="h-3 w-3 mr-1" />
            {t.exportExcel}
          </Button>
        )}
      </div>

      <Input
        placeholder={t.searchCustomer}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-ocid="records.search_input"
      />

      <Select value={lineFilter} onValueChange={setLineFilter}>
        <SelectTrigger className="h-8 text-xs" data-ocid="records.filter_tab">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.all} Lines</SelectItem>
          {visibleLineCategories.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <p
          className="text-center text-muted-foreground text-sm py-8"
          data-ocid="records.empty_state"
        >
          {t.noCustomers}
        </p>
      ) : (
        <div className="space-y-2" data-ocid="records.table">
          {filtered.map((c, i) => {
            const repay = loanRepayAmount(c);
            const paid = paidAmount(c.id, emiPayments);
            const outstanding = outstandingAmount(c, emiPayments);
            const status = loanStatus(c, emiPayments);
            const line = lineCategories.find((l) => l.id === c.lineCategoryId);
            return (
              <Card
                key={c.id}
                className="shadow-sm"
                data-ocid={`records.row.${i + 1}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">
                        {c.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          #{c.serialNumber}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line?.name} &bull;{" "}
                        {c.loanType === "Pre" ? t.loanTypePre : t.loanTypePost}{" "}
                        &bull; {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={status === "Active" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {status === "Active" ? t.active : t.completed}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                    <div>
                      <p className="text-muted-foreground">{t.loanAmount}</p>
                      <p className="font-medium">{formatINR(c.loanAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.paidAmount}</p>
                      <p className="font-medium text-emerald-600">
                        {formatINR(paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t.outstandingAmount}
                      </p>
                      <p className="font-medium text-amber-600">
                        {formatINR(outstanding)}
                      </p>
                    </div>
                  </div>
                  <Dialog
                    open={openDialogId === c.id}
                    onOpenChange={(open) => {
                      setOpenDialogId(open ? c.id : null);
                      if (!open) setConfirmDeleteId(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        data-ocid={`records.detail_button.${i + 1}`}
                      >
                        {t.viewDetails}
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="max-w-sm"
                      data-ocid="records.detail_modal"
                    >
                      <DialogHeader>
                        <DialogTitle>{c.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              [t.serialNumber, c.serialNumber],
                              ["Loan Date", formatDate(c.createdAt)],
                              [t.phone, c.phone],
                              [t.address, c.address],
                              [t.lineCategory, line?.name ?? ""],
                              [t.loanAmount, formatINR(c.loanAmount)],
                              [t.loanInterest, `${c.loanInterest}%`],
                              [
                                t.loanType,
                                c.loanType === "Pre"
                                  ? t.loanTypePre
                                  : t.loanTypePost,
                              ],
                              [t.loanRepayAmount, formatINR(repay)],
                              [t.paidAmount, formatINR(paid)],
                              [t.outstandingAmount, formatINR(outstanding)],
                            ] as [string, string][]
                          ).map(([k, v]) => (
                            <div key={k}>
                              <p className="text-muted-foreground text-xs">
                                {k}
                              </p>
                              <p className="font-medium">{v}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-semibold mb-2">{t.emiHistory}</p>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {customerEmis(c.id).length === 0 ? (
                              <p className="text-muted-foreground text-xs">
                                No payments recorded
                              </p>
                            ) : (
                              customerEmis(c.id).map((e) => (
                                <div
                                  key={e.id}
                                  className="flex justify-between text-xs bg-muted/50 rounded px-2 py-1"
                                >
                                  <span>{formatDate(e.paymentDate)}</span>
                                  <span className="font-medium">
                                    {formatINR(e.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="pt-1 border-t">
                            {confirmDeleteId === c.id ? (
                              <div className="space-y-2">
                                <p className="text-xs text-destructive font-medium">
                                  {language === "ta"
                                    ? "நிச்சயமாக நீக்கவா? அனைத்து தரவும் நீக்கப்படும்."
                                    : "Are you sure? All data for this customer will be permanently deleted."}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => handleDelete(c.id, c.name)}
                                    data-ocid="records.confirm_button"
                                  >
                                    {language === "ta"
                                      ? "உறுதிப்படுத்து நீக்கு"
                                      : "Confirm Delete"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => setConfirmDeleteId(null)}
                                    data-ocid="records.cancel_button"
                                  >
                                    {t.cancel}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => handleDelete(c.id, c.name)}
                                data-ocid={`records.delete_button.${i + 1}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {language === "ta"
                                  ? "வாடிக்கையாளரை நீக்கு"
                                  : "Delete Customer"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
