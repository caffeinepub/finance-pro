import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAppStore((s) => s.login);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const t = labels[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(username, password);
    if (!ok) toast.error("Invalid username or password");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/70 flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-3">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white font-display">
          {t.appName}
        </h1>
        <p className="text-white/70 text-sm mt-1">Lending Management System</p>
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-lg">{t.login}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t.username}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.username}
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.password}
                autoComplete="current-password"
                data-ocid="login.password_input"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              data-ocid="login.submit_button"
            >
              {t.login}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "ta" : "en")}
              className="text-xs text-muted-foreground underline"
            >
              {language === "en" ? "தமிழ்" : "Switch to English"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
