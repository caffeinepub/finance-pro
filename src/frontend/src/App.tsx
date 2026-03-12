import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import { useAppStore } from "./store/appStore";

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!currentUser)
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );

  return (
    <>
      <Layout settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
      <Toaster />
    </>
  );
}
