/**
 * Format a date to a human-readable "time ago" string
 * Examples: "just now", "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatTimeAgo(date: string | number | Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  // Invalid date
  if (isNaN(diffInSeconds)) return "Invalid date";

  // Future date
  if (diffInSeconds < 0) return "Just now";

  // Just now (less than 10 seconds)
  if (diffInSeconds < 10) return "Just now";

  // Seconds ago
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;

  // Minutes ago
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? "1 minute ago"
      : `${diffInMinutes} minutes ago`;
  }

  // Hours ago
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  // Days ago
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  // Weeks ago
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? "1 week ago" : `${diffInWeeks} weeks ago`;
  }

  // Months ago
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  // Years ago
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

/**
 * Format a date to a readable string with date and time
 * Example: "Feb 5, 2025 at 2:30 PM"
 */
export function formatDateTime(date: string | number | Date | null): string {
  if (!date) return "Never";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";

  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get a short relative time with full datetime as tooltip
 * Returns: { text: "2 hours ago", tooltip: "Feb 5, 2025 at 2:30 PM" }
 */
export function getRelativeTime(date: string | number | Date | null): {
  text: string;
  tooltip: string;
} {
  return {
    text: formatTimeAgo(date),
    tooltip: formatDateTime(date),
  };
}
