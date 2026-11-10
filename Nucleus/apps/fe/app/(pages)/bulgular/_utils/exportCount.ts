/*
 * The count the server gives for the findings Excel (`/reports/findings-count`,
 * R48): how many rows the file will hold for the same parameters.
 */

/** A JSON value, which is all a response body can be. */
export type CountBody = number | string | boolean | null | undefined | CountBody[] | { [key: string]: CountBody };

/**
 * The count out of a response, at whichever depth the action layer hands it:
 * `{ total }` once the envelope is opened, `{ data: { total } }` while it is not.
 * Anything that is not a whole, non-negative number is "not known", never 0.
 */
export function readCount(body: CountBody): number | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const total = body.total;
  if (typeof total === "number" && Number.isInteger(total) && total >= 0) return total;
  return readCount(body.data);
}

/** What one answer belongs to: the parameters it was asked with, so a late answer is not shown for other filters. */
export type CountAnswer = { key: string; total: number | null };

/** The count to show: the answer for these very parameters, or nothing yet. */
export function countToShow(answer: CountAnswer | null, key: string, enabled: boolean): number | null {
  return enabled && answer?.key === key ? answer.total : null;
}
