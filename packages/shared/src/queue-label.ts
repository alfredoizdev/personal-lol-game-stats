const QUEUE_LABELS: Record<number, string> = {
  420: 'Ranked Solo',
  440: 'Ranked Flex',
  400: 'Normal Draft',
  430: 'Normal Blind',
  450: 'ARAM',
  490: 'Quickplay',
  700: 'Clash',
  830: 'Co-op vs AI',
  840: 'Co-op vs AI',
  850: 'Co-op vs AI',
  900: 'ARURF',
  1300: 'Nexus Blitz',
  1700: 'Arena',
  1900: 'URF',
}

export function queueLabel(id: number): string {
  return QUEUE_LABELS[id] ?? 'Other'
}
