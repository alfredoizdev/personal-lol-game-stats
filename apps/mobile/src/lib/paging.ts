/** The list shows 10 games first and reveals 5 more per scroll-to-end. */
export const INITIAL_PAGE = 10
export const PAGE_STEP = 5

export function nextPage(current: number, total: number): number {
  return Math.min(current + PAGE_STEP, total)
}
