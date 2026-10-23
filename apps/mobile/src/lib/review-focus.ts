/**
 * "A Match Review is on screen" — the one signal the backfill honours to stay
 * out of the review's way (spec 5.3). Module-level on purpose: the Live tab
 * stays mounted behind the Matches tab, so a context would not reach it.
 */
let reviewsOpen = 0

export function setReviewOpen(open: boolean): void {
  reviewsOpen = Math.max(0, reviewsOpen + (open ? 1 : -1))
}

export function isReviewOpen(): boolean {
  return reviewsOpen > 0
}
