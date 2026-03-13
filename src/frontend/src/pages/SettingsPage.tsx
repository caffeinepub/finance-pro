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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Check,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAlert } from "../components/AlertPopup";
import { useAppStore } from "../store/appStore";
import { labels } from "../store/labels";
import { User } from "../store/types";

interface Props {
  onClose: () => void;
}

export default function SettingsPage({ onClose }: Props) {
  const store = useAppStore();
  const {
    currentUser,
    users,
    lineCategories,
    language,
    customers,
    emiPayments,
    reportCustomFields,
    restoreFromBackup,
  } = store;
  const t = labels[language];
  const isAdmin = currentUser?.role === "admin";
  const { showAlert, AlertComponent } = useAlert(language);

  const today = new Date().toISOString().split("T")[0];

  // Change password
  const [cp, setCp] = useState({ current: "", newP: "", confirm: "" });

  // Agent management
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({ username: "", password: "" });
  const [editAgent, setEditAgent] = useState<{
    id: string;
    username: string;
    password: string;
  } | null>(null);

  // Lines management
  const [editLine, setEditLine] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [newLine, setNewLine] = useState("");
  const [showAddLine, setShowAddLine] = useState(false);

  // Backup / Restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);

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
    showAlert(
      language === "ta"
        ? "பேக்கப் கோப்பு பதிவிறக்கம் செய்யப்பட்டது"
        : "Backup downloaded successfully",
      "success",
    );
  };

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
          showAlert(t.invalidBackupFile, "error");
          return;
        }
        setPendingRestoreData(parsed.data);
        setRestoreDialogOpen(true);
      } catch {
        showAlert(t.backupReadError, "error");
      }
    };
    reader.onerror = () => {
      showAlert(t.backupReadError, "error");
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
    showAlert(t.backupRestored, "success");
  };

  const handleChangePw = () => {
    if (!currentUser) return;
    if (cp.current !== currentUser.password) {
      toast.error("Current password incorrect");
      return;
    }
    if (cp.newP !== cp.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!cp.newP) {
      toast.error("New password required");
      return;
    }
    store.updateUser(currentUser.id, { password: cp.newP });
    toast.success("Password changed");
    setCp({ current: "", newP: "", confirm: "" });
  };

  const handleAddAgent = () => {
    if (!newAgent.username || !newAgent.password) {
      toast.error("Fill all fields");
      return;
    }
    store.addUser({
      username: newAgent.username,
      password: newAgent.password,
      role: "agent",
      assignedLines: [],
    });
    toast.success("Agent added");
    setNewAgent({ username: "", password: "" });
    setShowAddAgent(false);
  };

  const handleSaveEditAgent = () => {
    if (!editAgent) return;
    store.updateUser(editAgent.id, {
      username: editAgent.username,
      password: editAgent.password,
    });
    toast.success("Agent updated");
    setEditAgent(null);
  };

  const handleDeleteAgent = (id: string) => {
    if (id === currentUser?.id) {
      toast.error("Cannot delete yourself");
      return;
    }
    store.deleteUser(id);
    toast.success("Agent deleted");
  };

  const toggleLineAssignment = (agentId: string, lineId: string) => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    const current = agent.assignedLines;
    const updated = current.includes(lineId)
      ? current.filter((l) => l !== lineId)
      : [...current, lineId];
    store.updateUser(agentId, { assignedLines: updated });
  };

  const handleSaveLine = () => {
    if (!editLine) return;
    store.updateLineCategory(editLine.id, editLine.name);
    setEditLine(null);
    toast.success("Line renamed");
  };

  const handleAddLine = () => {
    if (!newLine.trim()) {
      toast.error("Enter line name");
      return;
    }
    store.addLineCategory(newLine.trim());
    setNewLine("");
    setShowAddLine(false);
    toast.success("Line added");
  };

  const handleDeleteLine = (id: string) => {
    const inUse = store.customers.some((c) => c.lineCategoryId === id);
    if (inUse) {
      toast.error("Cannot delete: customers assigned to this line");
      return;
    }
    store.deleteLineCategory(id);
    toast.success("Line deleted");
  };

  const agents = users.filter((u) => u.role === "agent");

  return (
    <div data-ocid="settings.page" className="space-y-4">
      {AlertComponent}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent data-ocid="settings.restore_dialog">
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
            <AlertDialogCancel data-ocid="settings.restore_cancel_button">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="settings.restore_confirm_button"
              onClick={handleConfirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === "ta" ? "மீட்டமை" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">{t.settings}</h2>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full" data-ocid="settings.tab">
          <TabsTrigger value="general" className="flex-1 text-xs">
            {t.general}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="agents" className="flex-1 text-xs">
              {t.agents}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="lines" className="flex-1 text-xs">
              {t.lines}
            </TabsTrigger>
          )}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-3 space-y-4">
          {/* Backup & Restore */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {language === "ta" ? "பேக்கப் & மீட்டமை" : "Backup & Restore"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={handleDownloadBackup}
                data-ocid="settings.backup_button"
              >
                <Download className="h-4 w-4 mr-2" />
                {language === "ta" ? "பேக்கப் பதிவிறக்கம்" : "Download Backup"}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleRestoreClick}
                data-ocid="settings.restore_button"
              >
                <Upload className="h-4 w-4 mr-2" />
                {language === "ta"
                  ? "பேக்கப்பிலிருந்து மீட்டமை"
                  : "Restore from Backup"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {language === "ta"
                  ? "💡 பேக்கப் கோப்பை Google Drive இல் பதிவேற்றவும்: drive.google.com → புதியது → கோப்பு பதிவேற்றம்."
                  : "💡 To save to Google Drive: tap Backup → upload the file at drive.google.com → New → File upload."}
              </p>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.changePassword}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.currentPassword}</Label>
                <Input
                  type="password"
                  value={cp.current}
                  onChange={(e) =>
                    setCp((p) => ({ ...p, current: e.target.value }))
                  }
                  data-ocid="settings.current_password_input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.newPassword}</Label>
                <Input
                  type="password"
                  value={cp.newP}
                  onChange={(e) =>
                    setCp((p) => ({ ...p, newP: e.target.value }))
                  }
                  data-ocid="settings.new_password_input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.confirmPassword}</Label>
                <Input
                  type="password"
                  value={cp.confirm}
                  onChange={(e) =>
                    setCp((p) => ({ ...p, confirm: e.target.value }))
                  }
                  data-ocid="settings.confirm_password_input"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleChangePw}
                data-ocid="settings.change_password_button"
              >
                {t.changePassword}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENTS */}
        {isAdmin && (
          <TabsContent value="agents" className="mt-3 space-y-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => setShowAddAgent(true)}
              data-ocid="settings.add_agent_button"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t.addAgent}
            </Button>
            {showAddAgent && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <Input
                    placeholder={t.username}
                    value={newAgent.username}
                    onChange={(e) =>
                      setNewAgent((p) => ({ ...p, username: e.target.value }))
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder={t.password}
                    type="password"
                    value={newAgent.password}
                    onChange={(e) =>
                      setNewAgent((p) => ({ ...p, password: e.target.value }))
                    }
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleAddAgent}
                    >
                      {t.save}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowAddAgent(false)}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {agents.map((agent, i) => (
              <Card key={agent.id} data-ocid={`settings.agent_item.${i + 1}`}>
                <CardContent className="p-3">
                  {editAgent?.id === agent.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editAgent.username}
                        onChange={(e) =>
                          setEditAgent((p) =>
                            p ? { ...p, username: e.target.value } : p,
                          )
                        }
                        className="h-8 text-xs"
                        placeholder={t.username}
                      />
                      <Input
                        value={editAgent.password}
                        onChange={(e) =>
                          setEditAgent((p) =>
                            p ? { ...p, password: e.target.value } : p,
                          )
                        }
                        className="h-8 text-xs"
                        placeholder={t.password}
                        type="password"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleSaveEditAgent}
                        >
                          {t.save}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditAgent(null)}
                        >
                          {t.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {agent.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.agent}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditAgent({
                                id: agent.id,
                                username: agent.username,
                                password: agent.password,
                              })
                            }
                            className="text-muted-foreground hover:text-foreground"
                            data-ocid={`settings.agent_edit_button.${i + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-destructive"
                            data-ocid={`settings.agent_delete_button.${i + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {t.assignLines}:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lineCategories.map((l) => (
                            <div key={l.id} className="flex items-center gap-1">
                              <Checkbox
                                id={`${agent.id}-${l.id}`}
                                checked={agent.assignedLines.includes(l.id)}
                                onCheckedChange={() =>
                                  toggleLineAssignment(agent.id, l.id)
                                }
                              />
                              <label
                                htmlFor={`${agent.id}-${l.id}`}
                                className="text-xs cursor-pointer"
                              >
                                {l.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* LINES */}
        {isAdmin && (
          <TabsContent value="lines" className="mt-3 space-y-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => setShowAddLine(true)}
              data-ocid="settings.add_line_button"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t.addLine}
            </Button>
            {showAddLine && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <Input
                    placeholder="Line name"
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleAddLine}
                    >
                      {t.save}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowAddLine(false)}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {lineCategories.map((line, i) => (
              <Card key={line.id} data-ocid={`settings.line_item.${i + 1}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  {editLine?.id === line.id ? (
                    <div className="flex flex-1 gap-2">
                      <Input
                        value={editLine.name}
                        onChange={(e) =>
                          setEditLine((p) =>
                            p ? { ...p, name: e.target.value } : p,
                          )
                        }
                        className="h-8 text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleSaveLine}
                        className="text-emerald-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditLine(null)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{line.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditLine({ id: line.id, name: line.name })
                          }
                          className="text-muted-foreground hover:text-foreground"
                          data-ocid={`settings.line_edit_button.${i + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-destructive"
                          data-ocid={`settings.line_delete_button.${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
