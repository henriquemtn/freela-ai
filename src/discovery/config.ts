// Lightweight provider facts for the web app; the providers themselves (which
// spawn the Claude CLI) are only loaded by the worker.

export const configuredProvider = () => process.env.FREELA_DISCOVERY_PROVIDER || "claude";

/** Providers whose IDs identify a business (safe for exact dedupe and Company.providerPlaceId). */
export const hasStableIds = (provider: string) => provider === "sample";
