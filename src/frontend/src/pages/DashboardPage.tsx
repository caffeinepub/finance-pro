import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  IndianRupee,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { outstandingAmount } from "../store/calculations";
import { labels } from "../store/labels";
import { formatINR } from "../utils/formatINR";

function toISTTime(isoString: string): string {
  const date = new Date(isoString);
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = (h % 12 || 12).toString().padStart(2, "0");
  return `${h12}:${m} ${ampm}`;
}

type Activity = {
  id: string;
  type: "new_loan" | "emi";
  customerName: string;
  amount: number;
  timestamp: string;
};

export default function DashboardPage() {
  const { customers, emiPayments, lineCategories, language, currentUser } =
    useAppStore();
  const t = labels[language];

  const isAgent = currentUser?.role === "agent";

  const availableLines = isAgent
    ? lineCategories.filter((l) => currentUser?.assignedLines.includes(l.id))
    : lineCategories;

  const [selectedLineId, setSelectedLineId] = useState<string>(
    isAgent && availableLines.length > 0 ? availableLines[0].id : "__all__",
  );

  const today = new Date().toISOString().split("T")[0];
  const todayMs = new Date(today).getTime();

  const filteredCustomers =
    selectedLineId === "__all__"
      ? customers
      : customers.filter((c) => c.lineCategoryId === selectedLineId);

  const filteredCustomerIds = new Set(filteredCustomers.map((c) => c.id));

  // Total Customers = only customers with Active loan status (outstanding > 0)
  const totalCustomers = filteredCustomers.filter(
    (c) => outstandingAmount(c, emiPayments) > 0,
  ).length;

  // Active Customers = customers where (current date - loan date) <= 120 days AND outstanding > 0
  const activeCustomers = filteredCustomers.filter((c) => {
    const loanDateMs = new Date(c.createdAt).getTime();
    const diffDays = (todayMs - loanDateMs) / (1000 * 60 * 60 * 24);
    return diffDays <= 120 && outstandingAmount(c, emiPayments) > 0;
  });
  const activeLoansCount = activeCustomers.length;

  const totalLoanAmount = filteredCustomers.reduce(
    (s, c) => s + c.loanAmount,
    0,
  );

  const todayCollection = emiPayments
    .filter(
      (e) => e.paymentDate === today && filteredCustomerIds.has(e.customerId),
    )
    .reduce((s, e) => s + e.amount, 0);

  // Outstanding Loan = sum of outstanding amounts of ALL customers in selected line
  const outstandingLoan = filteredCustomers.reduce(
    (s, c) => s + outstandingAmount(c, emiPayments),
    0,
  );

  // Active Loans = sum of outstanding amounts of Active Customers (loan date <= 120 days AND outstanding > 0)
  const activeLoansAmount = activeCustomers.reduce(
    (s, c) => s + outstandingAmount(c, emiPayments),
    0,
  );

  // --- Recent Activity (last 20, combined loans + EMIs) ---
  const loanActivities: Activity[] = filteredCustomers.map((c) => ({
    id: `loan_${c.id}`,
    type: "new_loan",
    customerName: c.name,
    amount: c.loanAmount,
    timestamp: c.addedAt ?? `${c.createdAt}T00:00:00.000Z`,
  }));

  const emiActivities: Activity[] = emiPayments
    .filter((e) => filteredCustomerIds.has(e.customerId))
    .map((e) => ({
      id: `emi_${e.id}`,
      type: "emi",
      customerName:
        customers.find((c) => c.id === e.customerId)?.name ?? "Unknown",
      amount: e.amount,
      timestamp: e.createdAt,
    }));

  const recentActivity = [...loanActivities, ...emiActivities]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20);

  const cards = [
    {
      label: t.totalCustomers,
      value: totalCustomers,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: t.activeLoans,
      value: activeLoansCount,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: t.totalLoanAmount,
      value: formatINR(totalLoanAmount),
      icon: IndianRupee,
      color: "text-amber-500",
    },
    {
      label: t.todayCollection,
      value: formatINR(todayCollection),
      icon: CreditCard,
      color: "text-violet-500",
    },
    {
      label: t.outstandingLoan,
      value: formatINR(outstandingLoan),
      icon: Wallet,
      color: "text-rose-500",
    },
    {
      label: t.activeLoansAmount,
      value: formatINR(activeLoansAmount),
      icon: TrendingUp,
      color: "text-teal-500",
    },
  ];

  return (
    <div data-ocid="dashboard.page" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t.dashboard}</h2>
      </div>

      {/* Line Category Filter */}
      <div data-ocid="dashboard.line_filter">
        <Select value={selectedLineId} onValueChange={setSelectedLineId}>
          <SelectTrigger
            className="w-full h-9 text-sm"
            data-ocid="dashboard.line_select"
          >
            <SelectValue placeholder={t.selectLine} />
          </SelectTrigger>
          <SelectContent>
            {!isAgent && <SelectItem value="__all__">{t.allLines}</SelectItem>}
            {availableLines.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground leading-tight">
                  {card.label}
                </span>
              </div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card data-ocid="dashboard.list">
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2">
            <p className="text-base font-bold text-foreground">
              {t.recentActivity}
            </p>
          </div>
          {recentActivity.length === 0 ? (
            <p
              className="text-center text-muted-foreground text-sm py-6"
              data-ocid="dashboard.empty_state"
            >
              {t.noCustomers}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-ocid={`dashboard.activity.item.${i + 1}`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      a.type === "new_loan" ? "bg-indigo-100" : "bg-emerald-100"
                    }`}
                  >
                    {a.type === "new_loan" ? (
                      <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {a.type === "new_loan"
                        ? `New loan: ${a.customerName}`
                        : `EMI from ${a.customerName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {toISTTime(a.timestamp)} &middot; {formatINR(a.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
