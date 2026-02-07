export interface SubscriptionMetadata {
  subscription_url: string;
  website_url?: string;
  content: string;
  last_updated: string | null;
  enabled?: boolean;
}

export function parseSubscriptionJson(jsonStr: string): SubscriptionMetadata {
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      subscription_url: parsed.subscription_url || "",
      website_url: parsed.website_url,
      content: parsed.content || "",
      last_updated: parsed.last_updated || null,
      enabled: parsed.enabled !== false,
    };
  } catch {
    return {
      subscription_url: "",
      website_url: "",
      content: "",
      last_updated: null,
      enabled: true,
    };
  }
}

export function stringifySubscriptionJson(
  metadata: SubscriptionMetadata,
): string {
  return JSON.stringify(metadata, null, 2);
}

/**
 * Extract node names from base64-encoded subscription content.
 * Skips metadata lines (REMARKS=, STATUS=, Traffic:, Expire:, etc.)
 * and extracts names from the URI fragment (#NodeName).
 */
export function extractNodeNames(content: string): string[] {
  if (!content) return [];
  try {
    const decoded = atob(content);
    const lines = decoded.split("\n").filter((line) => line.trim());
    const names: string[] = [];
    for (const line of lines) {
      const hashIndex = line.indexOf("#");
      if (hashIndex === -1) continue;
      // Must look like a proxy URI (contains ://)
      if (!line.includes("://")) continue;
      const name = decodeURIComponent(line.substring(hashIndex + 1).trim());
      if (name) names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}
