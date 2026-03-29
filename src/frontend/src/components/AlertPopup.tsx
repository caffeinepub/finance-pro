import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useCallback, useState } from "react";

interface AlertPopupState {
  open: boolean;
  message: string;
  title?: string;
  type: "success" | "error" | "info";
}

const typeConfig = {
  success: {
    banner: "bg-green-500",
    button: "bg-green-500 hover:bg-green-600 text-white",
    Icon: CheckCircle2,
  },
  error: {
    banner: "bg-red-500",
    button: "bg-red-500 hover:bg-red-600 text-white",
    Icon: XCircle,
  },
  info: {
    banner: "bg-blue-500",
    button: "bg-blue-500 hover:bg-blue-600 text-white",
    Icon: Info,
  },
};

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

  const cfg = typeConfig[state.type];
  const { Icon } = cfg;

  const AlertComponent = (
    <Dialog open={state.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-xs w-[90vw] rounded-2xl text-center p-0 overflow-hidden"
        data-ocid="alert_popup.dialog"
      >
        {/* Colored banner header */}
        <div
          className={`${cfg.banner} flex flex-col items-center justify-center py-6 px-4`}
        >
          <Icon className="h-12 w-12 text-white" strokeWidth={1.5} />
          {state.title && (
            <DialogHeader className="items-center mt-2">
              <DialogTitle className="text-lg font-bold text-center text-white">
                {state.title}
              </DialogTitle>
            </DialogHeader>
          )}
        </div>

        {/* Message body */}
        <div className="px-6 pt-4 pb-2">
          <DialogDescription className="text-base font-medium text-foreground text-center leading-snug">
            {state.message}
          </DialogDescription>
        </div>

        <DialogFooter className="sm:justify-center px-6 pb-5">
          <Button
            className={`w-full text-base font-semibold py-5 ${cfg.button}`}
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
