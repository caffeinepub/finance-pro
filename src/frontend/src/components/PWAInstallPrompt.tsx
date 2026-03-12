import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa_install_dismissed_until";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDeferredPrompt(null);
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(sevenDays));
  };

  if (!visible) return null;

  return (
    <div
      data-ocid="pwa.install_prompt.panel"
      className="fixed left-0 right-0 z-50 mx-3 flex items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 shadow-lg"
      style={{ bottom: "72px" }}
    >
      <Download className="h-5 w-5 shrink-0 text-white" />
      <p className="flex-1 text-sm text-white leading-tight">
        Install Finance Pro on your home screen for the best experience
      </p>
      <button
        type="button"
        data-ocid="pwa.install_prompt.button"
        onClick={handleInstall}
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
      >
        Install
      </button>
      <button
        type="button"
        data-ocid="pwa.install_prompt.close_button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-white hover:bg-blue-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
