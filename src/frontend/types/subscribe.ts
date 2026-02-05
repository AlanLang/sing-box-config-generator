export interface SubscriptionMetadata {
  subscription_url: string;
  website_url?: string;
  content: string;
  last_updated: string | null;
}

export function parseSubscriptionJson(jsonStr: string): SubscriptionMetadata {
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      subscription_url: parsed.subscription_url || "",
      website_url: parsed.website_url,
      content: parsed.content || "",
      last_updated: parsed.last_updated || null,
    };
  } catch {
    return {
      subscription_url: "",
      website_url: "",
      content: "",
      last_updated: null,
    };
  }
}

export function stringifySubscriptionJson(
  metadata: SubscriptionMetadata,
): string {
  return JSON.stringify(metadata, null, 2);
}
