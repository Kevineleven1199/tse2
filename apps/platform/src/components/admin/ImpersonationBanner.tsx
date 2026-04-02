"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut } from "lucide-react";

interface ImpersonationStatus {
  isImpersonating: boolean;
  targetInfo?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  adminInfo?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/admin/impersonate");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to check impersonation status:", error);
      }
    };

    checkImpersonation();
    // Optionally poll for changes every 30 seconds
    const interval = setInterval(checkImpersonation, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchBack = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" })
      });

      if (response.ok) {
        // Redirect to admin dashboard
        router.push("/admin");
      } else {
        console.error("Failed to stop impersonation");
      }
    } catch (error) {
      console.error("Error stopping impersonation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!status?.isImpersonating || !status.targetInfo) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 border-b-2 border-amber-400 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-amber-700 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Viewing as <span className="font-bold">{status.targetInfo.name}</span>
              <span className="text-amber-700 font-normal ml-2">
                ({status.targetInfo.role})
              </span>
            </p>
            {status.adminInfo && (
              <p className="text-xs text-amber-700 mt-1">
                Admin: {status.adminInfo.name} ({status.adminInfo.email})
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSwitchBack}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500 text-white rounded-md font-medium transition-colors whitespace-nowrap text-sm"
        >
          <LogOut className="h-4 w-4" />
          {isLoading ? "Switching..." : "Switch Back"}
        </button>
      </div>
    </div>
  );
}
