import type { Rating } from '@lpp/shared'
import { colors } from '@/theme/tokens'

export function ratingColor(r: Rating | null): string {
  switch (r) {
    case 'Poor':
      return colors.loss
    case 'Fair':
      return colors.warn
    case 'Good':
      return colors.accent
    case 'Great':
      return colors.win
    default:
      return colors.muted
  }
}
