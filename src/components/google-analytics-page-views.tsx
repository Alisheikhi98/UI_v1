import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  createGoogleAnalyticsPageView,
  GOOGLE_ANALYTICS_ENABLED,
  trackGoogleAnalyticsPageView,
} from "@/lib/google-analytics";

export function GoogleAnalyticsPageViews() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(
    function trackCurrentRoute() {
      if (!GOOGLE_ANALYTICS_ENABLED || lastTrackedPath.current === pathname) return;

      const timeoutId = window.setTimeout(() => {
        const tracked = trackGoogleAnalyticsPageView(
          createGoogleAnalyticsPageView(pathname, window.location.origin, document.title),
        );
        if (tracked) lastTrackedPath.current = pathname;
      }, 0);

      return () => window.clearTimeout(timeoutId);
    },
    [pathname],
  );

  return null;
}
