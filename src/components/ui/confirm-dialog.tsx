import * as React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

type ConfirmDialogVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const variantConfig: Record<
  ConfirmDialogVariant,
  { icon: React.ReactNode; iconBg: string; confirmVariant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | "neon" | "gradient" }
> = {
  danger: {
    icon: <AlertTriangle className="h-6 w-6 text-danger" />,
    iconBg: "bg-danger/10",
    confirmVariant: "destructive",
  },
  warning: {
    icon: <Info className="h-6 w-6 text-warning" />,
    iconBg: "bg-warning/10",
    confirmVariant: "default",
  },
  info: {
    icon: <CheckCircle2 className="h-6 w-6 text-info" />,
    iconBg: "bg-info/10",
    confirmVariant: "default",
  },
};

function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full p-3", config.iconBg)}>
              {config.icon}
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog, type ConfirmDialogProps, type ConfirmDialogVariant };
