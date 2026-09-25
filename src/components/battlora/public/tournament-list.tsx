"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import { TournamentCard, type TournamentCardData } from "../shared/tournament-card";
import { EmptyState, LoadingGrid, SectionHeader } from "../shared/kit";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "REGISTRATION_OPEN", label: "Registration Open" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
];

export function TournamentList() {
  const { navigate, route } = useRouter();
  const tabParam = route.query?.get("tab")?.toUpperCase() ?? null;
  const validTab =
    tabParam && FILTERS.some((f) => f.value === tabParam) ? tabParam : null;
  const [filter, setFilter] = useState(validTab ?? "ALL");
  const { data, loading } = useApiData<{ tournaments: TournamentCardData[] }>("/api/tournaments");

  // React "adjust state during render" pattern: when ?tab= changes while the
  // list stays mounted (e.g. /tournaments?tab=ongoing link from another page),
  // re-apply the requested filter without an effect-driven setState cascade.
  const [lastTab, setLastTab] = useState<string | null>(validTab);
  if (validTab !== lastTab) {
    setLastTab(validTab);
    setFilter(validTab ?? "ALL");
  }

  const tournaments = useMemo(() => {
    const list = data?.tournaments ?? [];
    if (filter === "ALL") return list;
    if (filter === "UPCOMING") return list.filter((t) => ["UPCOMING", "REGISTRATION_CLOSED"].includes(t.status));
    return list.filter((t) => t.status === filter);
  }, [data, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
      <SectionHeader
        title="Tournaments"
        subtitle="Every Free Fire competition on Battlora — filter by status to find your next battle."
      />

      {/* Filter chips */}
      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Tournament filters">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full whitespace-nowrap shrink-0",
              filter === f.value && "btn-primary-glow"
            )}
            onClick={() => setFilter(f.value)}
            role="tab"
            aria-selected={filter === f.value}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <LoadingGrid count={6} />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={<Swords className="h-10 w-10" />}
            title="No tournaments found"
            description="No tournaments match this filter right now. Try another category."
            action={
              <Button variant="outline" onClick={() => setFilter("ALL")}>
                Show all tournaments
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
