import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export interface ToastItem {
  id: number;
  message: string;
}

/** 顶部细条 toast：danger 色，5s 自动消失 */
export function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4">
      <div
        className="toast-in pointer-events-auto mt-3 flex w-full max-w-md items-center gap-2.5 rounded-md border px-4 py-2.5 text-sm shadow-floating"
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--state-danger)",
          color: "var(--fg)",
        }}
        role="alert"
      >
        <AlertCircle size={16} style={{ color: "var(--state-danger)" }} className="shrink-0" />
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={onClose}
          className="focus-ring shrink-0 rounded p-0.5 transition-colors hover:opacity-70"
          style={{ color: "var(--muted)" }}
          aria-label="关闭"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
