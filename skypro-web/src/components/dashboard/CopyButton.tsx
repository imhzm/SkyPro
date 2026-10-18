"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-xl bg-soft border border-line text-muted hover:text-brand hover:bg-sky-500/10 hover:border-sky-500/20 transition-all ${className}`}
      title="نسخ"
    >
      {copied ? (
        <Check className="w-4 h-4 text-positive" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
