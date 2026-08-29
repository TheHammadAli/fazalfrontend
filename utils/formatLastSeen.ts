import moment from "moment";

/**
 * "Last seen" wording for a chat header.
 *
 * Same calendar day → a bare clock time ("5:30 PM"), because the date would be
 * noise when it is today. Anything older → a relative distance ("3 days ago"),
 * which reads better than a date the user has to work out for themselves.
 *
 * moment renders a single unit as an article — "a day ago", "an hour ago" — so
 * those are rewritten to "1 day ago" / "1 hour ago" to match the rest of the
 * scale ("2 days ago", "3 days ago") rather than switching register at 1.
 */
export function formatLastSeen(
  lastSeenAt?: string | Date | null,
  language: string = "en",
): string {
  if (!lastSeenAt) return "";

  const seen = moment(lastSeenAt);
  if (!seen.isValid()) return "";

  const localised = seen.locale(language);

  if (localised.isSame(moment(), "day")) {
    return localised.format("h:mm A");
  }

  const relative = localised.fromNow();

  // Only rewrite the English articles; other locales phrase this differently and
  // moment already handles them.
  if (language !== "en") return relative;

  return relative.replace(
    /^an? (minute|hour|day|week|month|year)/,
    (_match, unit: string) => `1 ${unit}`,
  );
}

export default formatLastSeen;
