import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import AllLogsDetailPanel from "./AllLogsDetailPanel";

// A tiny wrapper that:
// - shows a floating button when minimized
// - auto-opens when new logs are loaded (logs.length > 0)
export default function AllLogsPanelToggle({
  logs = [],
  thresholds = {},
  selectedMetric = "rsrp",
  isLoading = false,
}) {
  const [open, setOpen] = useState(false);

  // Auto-open when logs are (re)loaded
  useEffect(() => {
    if (Array.isArray(logs) && logs.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [logs]);

  // Floating button (bottom-right) when minimized and logs exist
  const showFab = !open && Array.isArray(logs) && logs.length > 0;

  return (
    <>
      {open && (
        <AllLogsDetailPanel
          logs={logs}
          thresholds={thresholds}
          selectedMetric={selectedMetric}
          isLoading={isLoading}
          onClose={() => setOpen(false)} // acts as "minimize"
        />
      )}

      {showFab && (
        <button
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-4 py-2 shadow-lg hover:bg-indigo-700"
          onClick={() => setOpen(true)}
          title="Show logs summary"
        >
          <BarChart3 className="h-4 w-4" />
          Logs Summary
          <span className="ml-2 text-xs bg-white/20 rounded px-2 py-0.5">{logs.length}</span>
        </button>
      )}
    </>
  );
}