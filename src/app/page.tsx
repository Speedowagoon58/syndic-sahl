"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { AppShell } from "@/components/AppShell";
import { ExpensesTab } from "@/components/ExpensesTab";
import { OnboardingModal } from "@/components/OnboardingModal";
import { PaymentsTab } from "@/components/PaymentsTab";
import { ReportTab } from "@/components/ReportTab";
import { SettingsTab } from "@/components/SettingsTab";
import { SubscriptionTab } from "@/components/SubscriptionTab";

export default function HomePage() {
  const { hydrated, activeTab, toast, t } = useApp();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs font-medium text-zinc-500 dark:bg-[#09090B] dark:text-zinc-400">
        {t.common.loading}
      </div>
    );
  }

  return (
    <>
      <AppShell onOpenOnboarding={() => setOnboardingOpen(true)}>
        {activeTab === "payments" && <PaymentsTab />}
        {activeTab === "expenses" && <ExpensesTab />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "subscription" && <SubscriptionTab />}
        {activeTab === "settings" && <SettingsTab />}
      </AppShell>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {toast && (
        <div className="no-print fixed bottom-20 end-4 z-50 max-w-sm rounded-lg bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-950 lg:bottom-6">
          {toast}
        </div>
      )}
    </>
  );
}
