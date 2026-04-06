import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef, useState } from "react";
import BiometricLockScreen from "./components/BiometricLockScreen";
import Layout from "./components/Layout";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import LoginPage from "./pages/LoginPage";
import { useAppStore } from "./store/appStore";
import { isBiometricEnabled } from "./utils/biometricLock";

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isCloudLoaded = useAppStore((s) => s.isCloudLoaded);
  const loadCloudData = useAppStore((s) => s.loadCloudData);
  const loadAgentsPreLogin = useAppStore((s) => s.loadAgentsPreLogin);
  const logout = useAppStore((s) => s.logout);
  const language = useAppStore((s) => s.language);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showBiometricLock, setShowBiometricLock] = useState(false);
  const prevUserRef = useRef<string | null>(null);
  const agentsLoadedRef = useRef(false);
  const biometricCheckedRef = useRef<string | null>(null);

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
      // User just logged in (or session restored) — pull latest data from cloud
      loadCloudData();
      // Check if biometric lock should be shown for this user
      if (
        isBiometricEnabled(userId) &&
        biometricCheckedRef.current !== userId
      ) {
        biometricCheckedRef.current = userId;
        setShowBiometricLock(true);
      }
    }
    prevUserRef.current = userId;
  }, [currentUser, loadCloudData]);

  // Re-show lock when user switches back to the app (page visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && currentUser) {
        if (isBiometricEnabled(currentUser.id)) {
          setShowBiometricLock(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser]);

  if (!currentUser)
    return (
      <>
        <LoginPage />
        <PWAInstallPrompt />
        <Toaster />
      </>
    );

  // Show biometric lock screen if enabled
  if (showBiometricLock) {
    return (
      <BiometricLockScreen
        userId={currentUser.id}
        username={currentUser.username}
        language={language}
        onUnlocked={() => setShowBiometricLock(false)}
        onFallback={() => {
          // Log user out so they must re-enter credentials
          logout();
          setShowBiometricLock(false);
        }}
      />
    );
  }

  // Show loading screen while cloud data is being fetched
  if (!isCloudLoaded) {
    const loadingText =
      language === "ta" ? "தரவு ஏற்றுகிறது..." : "Loading data from cloud...";
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <p style={{ color: "#64748b", fontSize: "15px", fontWeight: 500 }}>
          {loadingText}
        </p>
      </div>
    );
  }

  return (
    <>
      <Layout settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
      <PWAInstallPrompt />
      <Toaster />
    </>
  );
}
