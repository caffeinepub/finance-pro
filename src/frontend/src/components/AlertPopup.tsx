import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCallback, useState } from "react";

interface AlertPopupState {
  open: boolean;
  message: string;
  title?: string;
  type: "success" | "error" | "info";
}

export function useAlert(language: "en" | "ta") {
  const [state, setState] = useState<AlertPopupState>({
    open: false,
    message: "",
    type: "info",
  });

  const showAlert = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "info",
      title?: string,
    ) => {
      setState({ open: true, message, type, title });
    },
    [],
  );

  const handleClose = () => setState((s) => ({ ...s, open: false }));

  const AlertComponent = (
    <Dialog open={state.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-xs w-[90vw] rounded-2xl text-center"
        data-ocid="alert_popup.dialog"
      >
        <DialogHeader className="items-center">
          <div className="text-4xl mb-1">
            {state.type === "success"
              ? "✅"
              : state.type === "error"
                ? "❌"
                : "ℹ️"}
          </div>
          {state.title && (
            <DialogTitle className="text-lg font-bold text-center">
              {state.title}
            </DialogTitle>
          )}
          <DialogDescription className="text-base font-medium text-foreground text-center leading-snug">
            {state.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            className="w-full text-base font-semibold py-5"
            onClick={handleClose}
            data-ocid="alert_popup.ok_button"
          >
            {language === "ta" ? "சரி" : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { showAlert, AlertComponent };
}
