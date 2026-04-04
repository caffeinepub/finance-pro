import { useState } from "react";
import AddEntryPage from "../pages/AddEntryPage";
import DashboardPage from "../pages/DashboardPage";
import RecordsPage from "../pages/RecordsPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import UpdateEmiPage from "../pages/UpdateEmiPage";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";
import BottomNav from "./BottomNav";
import Header from "./Header";

type Page = "dashboard" | "add-entry" | "update-emi" | "records" | "reports";

interface Props {
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
}

export default function Layout({ settingsOpen, setSettingsOpen }: Props) {
  const language = useAppStore((s) => s.language);
  const currentUser = useAppStore((s) => s.currentUser);
  const isAgent = currentUser?.role === "agent";
  const t = labels[language];

  // Always start on the dashboard — DashboardPage handles disabled agents internally
  const [page, setPage] = useState<Page>("dashboard");

  const handlePageChange = (p: string) => {
    setPage(p as Page);
  };

  const renderPage = () => {
    if (settingsOpen)
      return <SettingsPage onClose={() => setSettingsOpen(false)} />;
    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "add-entry":
        return <AddEntryPage />;
      case "update-emi":
        return <UpdateEmiPage />;
      case "records":
        return <RecordsPage />;
      case "reports":
        return <ReportsPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header onSettingsClick={() => setSettingsOpen(!settingsOpen)} />
      <main className="flex-1 overflow-y-auto pb-20 pt-16">
        <div className="max-w-md mx-auto px-3 py-4">{renderPage()}</div>
      </main>
      {!settingsOpen && (
        <BottomNav
          current={page}
          onChange={handlePageChange}
          t={t}
          isAgent={isAgent}
        />
      )}
    </div>
  );
}
