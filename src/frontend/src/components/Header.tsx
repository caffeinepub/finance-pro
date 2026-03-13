import { Button } from "@/components/ui/button";
import { Globe, LogOut, Settings } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";

interface Props {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: Props) {
  const { logout, language, setLanguage, syncStatus } = useAppStore();
  const t = labels[language];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground h-16 flex items-center px-4 shadow-lg">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xl font-bold tracking-wide font-display">
          {t.appName}
        </span>
        {syncStatus === "syncing" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/20 text-primary-foreground/90 animate-pulse">
            ⟳ {language === "ta" ? "ஒத்திசைக்கிறது" : "Syncing"}
          </span>
        )}
        {syncStatus === "synced" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/20 text-primary-foreground/90">
            ✓ {language === "ta" ? "ஒத்திசைக்கப்பட்டது" : "Synced"}
          </span>
        )}
        {syncStatus === "error" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/30 text-primary-foreground/80">
            ✕ {language === "ta" ? "பிழை" : "Offline"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-white/20 text-xs px-2 h-8"
          onClick={() => setLanguage(language === "en" ? "ta" : "en")}
          data-ocid="header.language_toggle"
        >
          <Globe className="h-4 w-4 mr-1" />
          {language === "en" ? "தமிழ்" : "EN"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-white/20 h-8 w-8"
          onClick={onSettingsClick}
          data-ocid="header.settings_button"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-white/20 h-8 w-8"
          onClick={logout}
          data-ocid="header.logout_button"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
