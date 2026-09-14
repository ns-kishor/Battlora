"use client";

import { createContext, useContext, useEffect } from "react";
import { useApiData } from "./data-hooks";

export type BootstrapData = {
  stats: {
    activeTournaments: number;
    registeredTeams: number;
    totalPlayers: number;
    totalPrizePool: number;
  };
  settings: {
    platformName: string;
    accentColor: string;
    contactEmail: string;
    contactPhone: string;
    paymentMethods: { name: string; number: string; type: string }[];
    paymentInstructions: string;
    faq: { q: string; a: string }[];
  };
  announcements: {
    id: string;
    title: string;
    description: string;
    priority: string;
    publishAt: string;
  }[];
};

const SettingsContext = createContext<{
  bootstrap: BootstrapData | null;
  refetchBootstrap: () => void;
}>({
  bootstrap: null,
  refetchBootstrap: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, refetch } = useApiData<BootstrapData>("/api/bootstrap");

  // Configurable accent color (PRD 48) — applied as a runtime CSS variable
  useEffect(() => {
    if (data?.settings?.accentColor) {
      document.documentElement.style.setProperty("--primary", data.settings.accentColor);
      document.documentElement.style.setProperty("--ring", data.settings.accentColor);
      document.documentElement.style.setProperty("--sidebar-primary", data.settings.accentColor);
    }
  }, [data?.settings?.accentColor]);

  return (
    <SettingsContext.Provider value={{ bootstrap: data, refetchBootstrap: refetch }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
