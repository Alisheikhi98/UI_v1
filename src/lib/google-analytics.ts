export const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-4KPTLX24CE";
export const GOOGLE_ANALYTICS_ENABLED = import.meta.env.PROD;
export const GOOGLE_ANALYTICS_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_MEASUREMENT_ID}`;

export interface GoogleAnalyticsPageView {
  page_path: string;
  page_location: string;
  page_title: string;
}

type GoogleAnalyticsCommand =
  | [command: "js", date: Date]
  | [command: "config", measurementId: string, options: { send_page_view: boolean }]
  | [command: "event", eventName: "page_view", parameters: GoogleAnalyticsPageView];

export type GoogleAnalyticsFunction = (...args: GoogleAnalyticsCommand) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleAnalyticsFunction;
  }
}

export const GOOGLE_ANALYTICS_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', '${GOOGLE_ANALYTICS_MEASUREMENT_ID}', { send_page_view: false });
`;

export function createGoogleAnalyticsPageView(
  pathname: string,
  origin: string,
  title: string,
): GoogleAnalyticsPageView {
  const pagePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return {
    page_path: pagePath,
    page_location: `${origin.replace(/\/$/, "")}${pagePath}`,
    page_title: title,
  };
}

export function trackGoogleAnalyticsPageView(pageView: GoogleAnalyticsPageView): boolean {
  if (!GOOGLE_ANALYTICS_ENABLED || typeof window === "undefined" || !window.gtag) return false;
  window.gtag("event", "page_view", pageView);
  return true;
}
