import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "../utils";

/** 复制按钮：点击后变「已复制」1.5s */
export function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      className="focus-ring inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors"
      style={{
        backgroundColor: "var(--panel)",
        borderColor: "var(--border)",
        color: copied ? "var(--state-ok)" : "var(--fg-2)",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "已复制" : label}
    </button>
  );
}
