"use client";

import { PropsWithChildren } from "react";
import { Toaster } from "@/src/components/ui/toaster";
import { ToastProvider } from "@/src/lib/toast";
import { ExitIntentPopup } from "@/src/components/ExitIntentPopup";
import { AnalyticsProvider } from "@/src/components/AnalyticsProvider";

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <ToastProvider>
      <AnalyticsProvider>
        {children}
        <Toaster />
        <ExitIntentPopup />
      </AnalyticsProvider>
    </ToastProvider>
  );
};

export default Providers;
