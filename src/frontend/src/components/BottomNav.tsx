import {
  BarChart3,
  FileText,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
} from "lucide-react";

type LabelSet = Record<string, string | ((...args: string[]) => string)>;

interface Props {
  current: string;
  onChange: (page: string) => void;
  t: LabelSet;
  isAgent?: boolean;
}

const allNavItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    labelKey: "dashboard",
  },
  {
    id: "add-entry",
    icon: PlusCircle,
    labelKey: "addEntry",
  },
  {
    id: "update-emi",
    icon: RefreshCw,
    labelKey: "updateEmi",
  },
  { id: "records", icon: FileText, labelKey: "records" },
  { id: "reports", icon: BarChart3, labelKey: "reports" },
];

export default function BottomNav({ current, onChange, t }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="max-w-md mx-auto flex">
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => onChange(item.id)}
              data-ocid={`nav.${item.id}.link`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? "stroke-[2.5]" : "stroke-[1.5]"
                }`}
              />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-semibold" : ""
                }`}
              >
                {
                  (typeof t[item.labelKey] === "string"
                    ? t[item.labelKey]
                    : item.labelKey) as string
                }
              </span>
              {active && (
                <div className="absolute top-0 h-0.5 w-8 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
