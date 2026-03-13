import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef, useState } from "react";
import Layout from "./components/Layout";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import LoginPage from "./pages/LoginPage";
import { useAppStore } from "./store/appStore";

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser);
  const loadCloudData = useAppStore((s) => s.loadCloudData);
  const loadAgentsPreLogin = useAppStore((s) => s.loadAgentsPreLogin);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevUserRef = useRef<string | null>(null);
  const agentsLoadedRef = useRef(false);

  // Load agents from cloud on app startup so login works across devices
  useEffect(() => {
    if (!agentsLoadedRef.current) {
      agentsLoadedRef.current = true;
      loadAgentsPreLogin();
    }
  }, [loadAgentsPreLogin]);

  useEffect(() => {
    const userId = currentUser?.id ?? null;
    if (userId && prevUserRef.current !== userId) {
      // User just logged in — pull latest data from cloud
      loadCloudData();
    }
    prevUserRef.current = userId;
  }, [currentUser, loadCloudData]);

  if (!currentUser)
    return (
      <>
        <LoginPage />
        <PWAInstallPrompt />
        <Toaster />
      </>
    );

  return (
    <>
      <Layout settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
      <PWAInstallPrompt />
      <Toaster />
    </>
  );
}
