"use client";

import { useState, useEffect, type MouseEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import { hasAnalyticsConsent } from "@/lib/product-analytics";

const DOWNLOADS_BASE = "https://downloads.skywaveads.com/skypro";

export default function DesktopDownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${DOWNLOADS_BASE}/version.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        if (data.version) setVersion(data.version);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recordDownload = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || !downloadUrl || !hasAnalyticsConsent()) return;
    // Keep the installer link independent of collection or a failed request.
    void fetch("/api/account/windows-download-click", {
      method: "POST",
      keepalive: true,
      referrerPolicy: "origin",
    }).catch(() => {});
  };

  if (!loading && !downloadUrl) {
    // No version.json available yet — hide the button or show disabled
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-soft border border-line px-5 py-2.5 text-sm text-muted cursor-not-allowed">
        <Download className="w-4 h-4" />
        تحميل البرنامج (قريباً)
      </span>
    );
  }

  return (
    <a
      href={downloadUrl || "#"}
      onClick={recordDownload}
      onAuxClick={(event) => {
        if (event.button === 1) recordDownload(event);
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-soft border border-line px-5 py-2.5 text-sm text-muted hover:bg-soft hover:text-foreground transition-all"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {version ? `تحميل البرنامج v${version}` : "تحميل البرنامج"}
    </a>
  );
}
