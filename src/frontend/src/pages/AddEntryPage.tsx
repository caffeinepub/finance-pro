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
import { Search, UserCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAlert } from "../components/AlertPopup";
import { useAppStore } from "../store/appStore";
import { loanRepayAmount } from "../store/calculations";
import { labels } from "../store/labels";
import type { LoanType } from "../store/types";
import { formatINR } from "../utils/formatINR";

interface Props {
  onSuccess?: () => void;
}

const ERR_REQUIRED = { en: "Required", ta: "தேவை" };
const ERR_PHONE = {
  en: "Must be exactly 10 digits",
  ta: "சரியாக 10 இலக்கங்கள் இருக்க வேண்டும்",
};

const SEARCH_LABEL = {
  en: "Search existing customer (optional)",
  ta: "இருக்கும் வாடிக்கையாளரை தேடுங்கள் (விருப்பமானது)",
};

const NO_RESULTS = {
  en: "No matching customers found",
  ta: "பொருந்தும் வாடிக்கையாளர்கள் இல்லை",
};

const AUTOFILL_HINT = {
  en: "Customer details auto-filled. Update loan fields below.",
  ta: "வாடிக்கையாளர் விவரங்கள் நிரப்பப்பட்டன. கீழே கடன் விவரங்களை உள்ளிடுங்கள்.",
};

type FormFields = {
  serialNumber: string;
  name: string;
  phone: string;
  address: string;
  loanAmount: string;
  loanInterest: string;
  loanFee: string;
  loanType: LoanType;
  lineCategoryId: string;
  loanDate: string;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

export default function AddEntryPage({ onSuccess }: Props) {
  const { lineCategories, addCustomer, language, currentUser, customers } =
    useAppStore();
  const t = labels[language];
  const { showAlert, AlertComponent } = useAlert(language);

  const isAgent = currentUser?.role === "agent";
  const assignedLines = currentUser?.assignedLines ?? [];

  const visibleLineCategories = isAgent
    ? lineCategories.filter((l) => assignedLines.includes(l.id))
    : lineCategories;

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<FormFields>({
    serialNumber: "",
    name: "",
    phone: "",
    address: "",
    loanAmount: "",
    loanInterest: "",
    loanFee: "",
    loanType: "Post",
    lineCategoryId: "",
    loanDate: today,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Customer search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter customers by selected line + search query
  const matchingCustomers =
    form.lineCategoryId && searchQuery.trim().length > 0
      ? customers
          .filter(
            (c) =>
              c.lineCategoryId === form.lineCategoryId &&
              c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
          )
          .slice(0, 8)
      : [];

  const handleAutofill = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    const updated = {
      ...form,
      name: c.name,
      phone: c.phone,
      address: c.address,
      serialNumber: c.serialNumber,
    };
    setForm(updated);
    if (submitted) {
      setErrors(validate(updated));
    }
    setSearchQuery("");
    setShowDropdown(false);
    setAutofilled(true);
  };

  const clearAutofill = () => {
    setForm((prev) => ({
      ...prev,
      name: "",
      phone: "",
      address: "",
      serialNumber: "",
    }));
    setAutofilled(false);
    setSearchQuery("");
  };

  const preview =
    form.loanAmount && form.loanInterest
      ? loanRepayAmount({
          loanAmount: Number(form.loanAmount),
          loanInterest: Number(form.loanInterest),
          loanType: form.loanType,
        } as Parameters<typeof loanRepayAmount>[0])
      : null;

  const required = ERR_REQUIRED[language];
  const phoneErr = ERR_PHONE[language];

  function validate(f: FormFields): FieldErrors {
    const e: FieldErrors = {};
    if (!f.lineCategoryId) e.lineCategoryId = required;
    if (!f.loanDate) e.loanDate = required;
    if (!f.serialNumber.trim()) e.serialNumber = required;
    if (!f.name.trim()) e.name = required;
    if (!f.phone.trim()) {
      e.phone = required;
    } else if (!/^\d{10}$/.test(f.phone.trim())) {
      e.phone = phoneErr;
    }
    if (!f.address.trim()) e.address = required;
    if (!f.loanAmount) e.loanAmount = required;
    if (!f.loanInterest) e.loanInterest = required;
    if (!f.loanFee) e.loanFee = required;
    return e;
  }

  const handleFieldChange = <K extends keyof FormFields>(
    key: K,
    value: FormFields[K],
  ) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    if (submitted) {
      const newErrors = validate(updated);
      setErrors(newErrors);
    }
    // Clear autofill badge if user manually edits autofilled fields
    if (["name", "phone", "address", "serialNumber"].includes(key)) {
      setAutofilled(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

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
      loanDate: form.loanDate,
      isActive: true,
    });
    showAlert(t.customerAdded, "success");
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
      loanDate: today,
    });
    setErrors({});
    setSubmitted(false);
    setAutofilled(false);
    setSearchQuery("");
    onSuccess?.();
  };

  const field = (
    key: keyof Omit<FormFields, "loanType" | "lineCategoryId">,
  ) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange(key, e.target.value),
  });

  const ErrorMsg = ({ fieldKey }: { fieldKey: keyof FormFields }) =>
    errors[fieldKey] ? (
      <p className="text-xs text-red-500 mt-0.5">{errors[fieldKey]}</p>
    ) : null;

  return (
    <div data-ocid="add_entry.page">
      {AlertComponent}
      <h2 className="text-lg font-bold mb-4">{t.addEntry}</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Customer &amp; Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 1. Line Category */}
            <div className="space-y-1">
              <Label className="text-xs">{t.lineCategory} *</Label>
              <Select
                value={form.lineCategoryId}
                onValueChange={(v) => {
                  handleFieldChange("lineCategoryId", v);
                  setSearchQuery("");
                  setShowDropdown(false);
                  setAutofilled(false);
                }}
              >
                <SelectTrigger
                  data-ocid="add_entry.line_category_select"
                  className={errors.lineCategoryId ? "border-red-500" : ""}
                >
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
              <ErrorMsg fieldKey="lineCategoryId" />
            </div>

            {/* 1b. Customer Search / Autofill (shown after line category selected) */}
            {form.lineCategoryId && (
              <div className="space-y-1" ref={searchRef}>
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Search className="w-3 h-3" />
                  {SEARCH_LABEL[language]}
                </Label>

                {autofilled ? (
                  <div
                    data-ocid="add_entry.success_state"
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      {AUTOFILL_HINT[language]}
                    </span>
                    <button
                      type="button"
                      onClick={clearAutofill}
                      className="shrink-0 text-green-500 hover:text-green-700"
                      aria-label="Clear autofill"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      data-ocid="add_entry.search_input"
                      placeholder={
                        language === "ta"
                          ? "பெயர் தேடுங்கள்..."
                          : "Type customer name..."
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => {
                        if (searchQuery.trim()) setShowDropdown(true);
                      }}
                      className="pl-8 text-sm h-9"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setShowDropdown(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Dropdown */}
                    {showDropdown && searchQuery.trim().length > 0 && (
                      <div
                        data-ocid="add_entry.dropdown_menu"
                        className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden"
                      >
                        {matchingCustomers.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                            {NO_RESULTS[language]}
                          </div>
                        ) : (
                          <ul className="max-h-48 overflow-y-auto">
                            {matchingCustomers.map((c, idx) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  data-ocid={`add_entry.item.${idx + 1}`}
                                  className="w-full text-left px-3 py-2.5 hover:bg-accent active:bg-accent/80 transition-colors border-b border-border/40 last:border-0"
                                  onClick={() => handleAutofill(c.id)}
                                >
                                  <p className="text-sm font-medium truncate">
                                    {c.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {c.phone}
                                    {c.address ? ` · ${c.address}` : ""}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Loan Date (moved to 2nd position) */}
            <div className="space-y-1">
              <Label className="text-xs">Loan Date *</Label>
              <Input
                type="date"
                {...field("loanDate")}
                className={errors.loanDate ? "border-red-500" : ""}
                data-ocid="add_entry.loan_date_input"
              />
              <ErrorMsg fieldKey="loanDate" />
            </div>

            {/* 3. Serial Number & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.serialNumber} *</Label>
                <Input
                  placeholder=""
                  {...field("serialNumber")}
                  className={errors.serialNumber ? "border-red-500" : ""}
                  data-ocid="add_entry.serial_input"
                />
                <ErrorMsg fieldKey="serialNumber" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.phone} *</Label>
                <Input
                  placeholder=""
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    handleFieldChange("phone", val);
                  }}
                  className={errors.phone ? "border-red-500" : ""}
                  data-ocid="add_entry.phone_input"
                />
                <ErrorMsg fieldKey="phone" />
              </div>
            </div>

            {/* 4. Customer Name */}
            <div className="space-y-1">
              <Label className="text-xs">{t.customerName} *</Label>
              <Input
                placeholder=""
                {...field("name")}
                className={errors.name ? "border-red-500" : ""}
                data-ocid="add_entry.name_input"
              />
              <ErrorMsg fieldKey="name" />
            </div>

            {/* 5. Address */}
            <div className="space-y-1">
              <Label className="text-xs">{t.address} *</Label>
              <Input
                placeholder=""
                {...field("address")}
                className={errors.address ? "border-red-500" : ""}
                data-ocid="add_entry.address_input"
              />
              <ErrorMsg fieldKey="address" />
            </div>

            {/* 6. Loan Amount & Interest */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.loanAmount} *</Label>
                <Input
                  placeholder=""
                  type="number"
                  {...field("loanAmount")}
                  className={errors.loanAmount ? "border-red-500" : ""}
                  data-ocid="add_entry.loan_amount_input"
                />
                <ErrorMsg fieldKey="loanAmount" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.loanInterest} *</Label>
                <Input
                  placeholder=""
                  type="number"
                  {...field("loanInterest")}
                  className={errors.loanInterest ? "border-red-500" : ""}
                  data-ocid="add_entry.loan_interest_input"
                />
                <ErrorMsg fieldKey="loanInterest" />
              </div>
            </div>

            {/* 7. Loan Fee */}
            <div className="space-y-1">
              <Label className="text-xs">
                {t.loanFee}{" "}
                <span className="text-muted-foreground">(மகிமை)</span>
                {" *"}
              </Label>
              <Input
                placeholder=""
                type="number"
                {...field("loanFee")}
                className={errors.loanFee ? "border-red-500" : ""}
                data-ocid="add_entry.loan_fee_input"
              />
              <ErrorMsg fieldKey="loanFee" />
            </div>

            {/* 8. Loan Type */}
            <div className="space-y-1">
              <Label className="text-xs">{t.loanType} *</Label>
              <Select
                value={form.loanType}
                onValueChange={(v) =>
                  handleFieldChange("loanType", v as LoanType)
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

            {/* Repay Preview */}
            {preview !== null && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">
                  {t.loanRepayAmount}:{" "}
                </span>
                <span className="font-bold text-primary">
                  {formatINR(preview)}
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
