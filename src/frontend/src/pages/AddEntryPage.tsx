import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store/appStore";
import { loanRepayAmount } from "../store/calculations";
import { labels } from "../store/labels";
import type { LoanType } from "../store/types";

interface Props {
  onSuccess?: () => void;
}

export default function AddEntryPage({ onSuccess }: Props) {
  const { lineCategories, addCustomer, language, currentUser } = useAppStore();
  const t = labels[language];

  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  // Agents can only add customers to their assigned lines
  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  const [form, setForm] = useState({
    serialNumber: "",
    name: "",
    phone: "",
    address: "",
    loanAmount: "",
    loanInterest: "",
    loanFee: "",
    loanType: "Post" as LoanType,
    lineCategoryId: "",
  });

  const preview =
    form.loanAmount && form.loanInterest
      ? loanRepayAmount({
          loanAmount: Number(form.loanAmount),
          loanInterest: Number(form.loanInterest),
          loanType: form.loanType,
        } as Parameters<typeof loanRepayAmount>[0])
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.serialNumber ||
      !form.name ||
      !form.loanAmount ||
      !form.lineCategoryId
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    addCustomer({
      serialNumber: form.serialNumber,
      name: form.name,
      phone: form.phone,
      address: form.address,
      loanAmount: Number(form.loanAmount),
      loanInterest: Number(form.loanInterest),
      loanFee: Number(form.loanFee) || 0,
      loanType: form.loanType,
      lineCategoryId: form.lineCategoryId,
      isActive: true,
    });
    toast.success("Customer added successfully");
    setForm({
      serialNumber: "",
      name: "",
      phone: "",
      address: "",
      loanAmount: "",
      loanInterest: "",
      loanFee: "",
      loanType: "Post",
      lineCategoryId: "",
    });
    onSuccess?.();
  };

  const field = (key: string) => ({
    value: (form as Record<string, string>)[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div data-ocid="add_entry.page">
      <h2 className="text-lg font-bold mb-4">{t.addEntry}</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Customer & Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t.lineCategory} *</Label>
              <Select
                value={form.lineCategoryId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, lineCategoryId: v }))
                }
              >
                <SelectTrigger data-ocid="add_entry.line_category_select">
                  <SelectValue placeholder={t.selectLine} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.serialNumber} *</Label>
                <Input
                  placeholder=""
                  {...field("serialNumber")}
                  data-ocid="add_entry.serial_input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.phone}</Label>
                <Input
                  placeholder=""
                  type="tel"
                  {...field("phone")}
                  data-ocid="add_entry.phone_input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.customerName} *</Label>
              <Input
                placeholder="Customer name"
                {...field("name")}
                data-ocid="add_entry.name_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.address}</Label>
              <Input
                placeholder="Address"
                {...field("address")}
                data-ocid="add_entry.address_input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.loanAmount} *</Label>
                <Input
                  placeholder=""
                  type="number"
                  {...field("loanAmount")}
                  data-ocid="add_entry.loan_amount_input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.loanInterest}</Label>
                <Input
                  placeholder=""
                  type="number"
                  {...field("loanInterest")}
                  data-ocid="add_entry.loan_interest_input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {t.loanFee}{" "}
                <span className="text-muted-foreground">(மகிமை)</span>
              </Label>
              <Input
                placeholder="0"
                type="number"
                {...field("loanFee")}
                data-ocid="add_entry.loan_fee_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.loanType}</Label>
              <Select
                value={form.loanType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, loanType: v as LoanType }))
                }
              >
                <SelectTrigger data-ocid="add_entry.loan_type_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre">{t.loanTypePre}</SelectItem>
                  <SelectItem value="Post">{t.loanTypePost}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preview !== null && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">
                  {t.loanRepayAmount}:{" "}
                </span>
                <span className="font-bold text-primary">
                  ₹{preview.toLocaleString()}
                </span>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              data-ocid="add_entry.submit_button"
            >
              {t.save} Customer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
