"use client";

// Hash-based client router — the whole platform lives on "/" (single page)
// Routes: #/ #/tournaments #/tournaments/:id #/login #/register
//         #/join/:tournamentId  #/dashboard/...  #/admin/...

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type RouteState = {
  path: string;
  segments: string[];
  query: URLSearchParams | null;
};

function parseHash(): RouteState {
  if (typeof window === "undefined") return { path: "/", segments: [], query: null };
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: queryPart ? new URLSearchParams(queryPart) : null,
  };
}

const RouterContext = createContext<{
  route: RouteState;
  navigate: (path: string, opts?: { replace?: boolean }) => void;
}>({
  route: { path: "/", segments: [], query: null },
  navigate: () => {},
});

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    // Normalize: ensure hash exists so back button works naturally
    if (!window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + "#/");
    }
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((path: string, opts?: { replace?: boolean }) => {
    const target = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (opts?.replace) {
      window.history.replaceState(null, "", window.location.pathname + target);
      setRoute(parseHash());
    } else if (window.location.hash === target) {
      setRoute(parseHash());
    } else {
      window.location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
