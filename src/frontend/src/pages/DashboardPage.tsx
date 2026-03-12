import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  Download,
  IndianRupee,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store/appStore";
import { outstandingAmount } from "../store/calculations";
import { labels } from "../store/labels";

export default function DashboardPage() {
  const {
    customers,
    emiPayments,
    lineCategories,
    language,
    users,
    reportCustomFields,
    restoreFromBackup,
  } = useAppStore();
  const t = labels[language];

  const today = new Date().toISOString().split("T")[0];

  const totalCustomers = customers.length;
  const activeLoans = customers.filter(
    (c) => outstandingAmount(c, emiPayments) > 0,
  ).length;
  const totalLoanAmount = customers.reduce((s, c) => s + c.loanAmount, 0);
  const todayCollection = emiPayments
    .filter((e) => e.paymentDate === today)
    .reduce((s, e) => s + e.amount, 0);

  const recentActivity = [...emiPayments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((e) => ({
      ...e,
      customerName:
        customers.find((c) => c.id === e.customerId)?.name ?? "Unknown",
      lineName:
        lineCategories.find(
          (l) =>
            l.id ===
            customers.find((c) => c.id === e.customerId)?.lineCategoryId,
        )?.name ?? "",
    }));

  const cards = [
    {
      label: t.totalCustomers,
      value: totalCustomers,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: t.activeLoans,
      value: activeLoans,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: t.totalLoanAmount,
      value: `₹${totalLoanAmount.toLocaleString()}`,
      icon: IndianRupee,
      color: "text-amber-500",
    },
    {
      label: t.todayCollection,
      value: `₹${todayCollection.toLocaleString()}`,
      icon: CreditCard,
      color: "text-violet-500",
    },
  ];

  const handleDownloadBackup = () => {
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {
        customers,
        emiPayments,
        lineCategories,
        users: users.map((u) => ({ ...u, password: undefined })),
        reportCustomFields,
      },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-pro-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed?.data?.customers) {
          toast.error(
            language === "ta"
              ? "தவறான கோப்பு வடிவம்"
              : "Invalid backup file format",
          );
          return;
        }
        setPendingRestoreData(parsed.data);
        setRestoreDialogOpen(true);
      } catch {
        toast.error(
          language === "ta"
            ? "கோப்பை படிக்க முடியவில்லை"
            : "Could not read the backup file",
        );
      }
    };
    reader.onerror = () => {
      toast.error(
        language === "ta"
          ? "கோப்பை படிக்க முடியவில்லை"
          : "Could not read the backup file",
      );
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    restoreFromBackup({
      customers: pendingRestoreData.customers,
      emiPayments: pendingRestoreData.emiPayments,
      lineCategories: pendingRestoreData.lineCategories,
      reportCustomFields: pendingRestoreData.reportCustomFields,
    });
    setPendingRestoreData(null);
    setRestoreDialogOpen(false);
    toast.success(
      language === "ta"
        ? "தரவு வெற்றிகரமாக மீட்டமைக்கப்பட்டது"
        : "Data restored successfully",
    );
  };

  return (
    <div data-ocid="dashboard.page" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t.dashboard}</h2>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="dashboard.restore_button"
            size="sm"
            variant="outline"
            onClick={handleRestoreClick}
            className="flex items-center gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {language === "ta" ? "மீட்டமை" : "Restore"}
          </Button>
          <Button
            data-ocid="dashboard.backup_button"
            size="sm"
            variant="outline"
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {language === "ta" ? "பேக்கப்" : "Backup"}
          </Button>
        </div>
      </div>

      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Restore confirmation dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent data-ocid="dashboard.restore_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ta" ? "தரவை மீட்டமைக்கவா?" : "Restore Backup?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ta"
                ? "இது தற்போதைய அனைத்து வாடிக்கையாளர் மற்றும் EMI தரவையும் பேக்கப்பிலிருந்து மாற்றும். இதை செயல்தவிர்க்க முடியாது. தொடர வேண்டுமா?"
                : "This will replace all existing customer and EMI data with the backup. This cannot be undone. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="dashboard.restore_cancel_button">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="dashboard.restore_confirm_button"
              onClick={handleConfirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === "ta" ? "மீட்டமை" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <Card data-ocid="dashboard.list">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              {t.noCustomers}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2.5"
                  data-ocid={`dashboard.activity.item.${i + 1}`}
                >
                  <div>
                    <p className="text-sm font-medium">{a.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.lineName} &bull; {a.paymentDate}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    ₹{a.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            {language === "ta"
              ? "💡 பேக்கப் கோப்பை Google Drive இல் பதிவேற்றவும்: drive.google.com → புதியது → கோப்பு பதிவேற்றம். மீட்டமைக்க: Restore பொத்தானை அழுத்தி JSON கோப்பை தேர்வு செய்யவும்."
              : "💡 To save backup to Google Drive: tap Backup → then upload the downloaded file at drive.google.com → New → File upload. To restore: tap Restore and select your JSON backup file."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
