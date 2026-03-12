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
import { Download } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../store/appStore";
import {
  loanRepayAmount,
  loanStatus,
  outstandingAmount,
  paidAmount,
} from "../store/calculations";
import { labels } from "../store/labels";
import { exportCustomers } from "../utils/excel";

export default function RecordsPage() {
  const { customers, emiPayments, lineCategories, language, currentUser } =
    useAppStore();
  const t = labels[language];
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");

  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  // Agents see only their assigned line categories
  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  // Agents see only customers from their assigned lines
  const accessibleCustomers = isAgent
    ? customers.filter((c) => assignedLines.includes(c.lineCategoryId))
    : customers;

  const filtered = accessibleCustomers.filter((c) => {
    const matchLine = lineFilter === "all" || c.lineCategoryId === lineFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.serialNumber.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q);
    return matchLine && matchSearch;
  });

  const customerEmis = (id: string) =>
    emiPayments
      .filter((e) => e.customerId === id)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

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
                        {c.loanType === "Pre" ? t.loanTypePre : t.loanTypePost}
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
                      <p className="font-medium">
                        ₹{c.loanAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.paidAmount}</p>
                      <p className="font-medium text-emerald-600">
                        ₹{paid.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t.outstandingAmount}
                      </p>
                      <p className="font-medium text-amber-600">
                        ₹{outstanding.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Dialog>
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
                              [t.phone, c.phone],
                              [t.address, c.address],
                              [t.lineCategory, line?.name ?? ""],
                              [
                                t.loanAmount,
                                `₹${c.loanAmount.toLocaleString()}`,
                              ],
                              [t.loanInterest, `${c.loanInterest}%`],
                              [
                                t.loanType,
                                c.loanType === "Pre"
                                  ? t.loanTypePre
                                  : t.loanTypePost,
                              ],
                              [t.loanRepayAmount, `₹${repay.toLocaleString()}`],
                              [t.paidAmount, `₹${paid.toLocaleString()}`],
                              [
                                t.outstandingAmount,
                                `₹${outstanding.toLocaleString()}`,
                              ],
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
                                  <span>{e.paymentDate}</span>
                                  <span className="font-medium">
                                    ₹{e.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
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
