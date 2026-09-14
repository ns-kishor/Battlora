"use client";

import { useApiData } from "../data-hooks";
import { useRouter } from "../router";
import { RulesView } from "../public/tournament-detail";
import { EmptyState, LoadingRows, SectionHeader } from "../shared/kit";
import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import type { RuleSection } from "@/lib/types";

type DashboardData = {
  activeTournamentId: string | null;
  standings: { tournament: { name: string } } | null;
};

export function DashboardRules() {
  const { navigate } = useRouter();
  const { data: dash, loading } = useApiData<DashboardData>("/api/me/dashboard");
  const tid = dash?.activeTournamentId;

  const { data, loading: loadingRules } = useApiData<{ tournament: { name: string; rules: RuleSection[] } }>(
    tid ? `/api/tournaments/${tid}` : null
  );

  if (loading || loadingRules) return <LoadingRows count={3} />;

  if (!tid || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Rules" subtitle="Tournament rulebook" />
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="No tournament context"
          description="Register for a tournament to access its rulebook."
          action={<Button onClick={() => navigate("/tournaments")}>Browse tournaments</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Rules & Regulations" subtitle={data.tournament.name} />
      <RulesView rules={data.tournament.rules ?? []} />
    </div>
  );
}
