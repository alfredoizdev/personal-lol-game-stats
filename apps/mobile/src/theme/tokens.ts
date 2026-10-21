/** Visual direction: docs/mockups/06-08 (navy + violet, cyan = you, red = enemy). */
export const colors = {
  bg: '#0B0A1F',
  bgGradientTop: '#15113A',
  surface: 'rgba(32, 27, 73, 0.55)',
  surfaceSolid: '#1B1742',
  border: 'rgba(139, 92, 246, 0.22)',
  text: '#F3F1FF',
  muted: '#9A95C7',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139, 92, 246, 0.18)',
  you: '#22D3EE',
  enemy: '#FB5C7A',
  win: '#2DD4A6',
  loss: '#FB5C7A',
  warn: '#F59E0B',
} as const

export const space = { xs: 4, sm: 8, md: 16, lg: 24 } as const

export const font = { title: 30, body: 17, caption: 13 } as const

export const radius = { card: 18, control: 12, pill: 999 } as const
