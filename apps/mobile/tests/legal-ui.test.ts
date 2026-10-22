import { describe, it, expect } from 'vitest'
import { acceptedVersionLabel } from '../src/lib/legal-ui'

describe('acceptedVersionLabel', () => {
  it('shows the stored version', () => {
    expect(acceptedVersionLabel('2026-10-22')).toBe('2026-10-22')
  })
  it('shows a dash for accounts without the metadata', () => {
    expect(acceptedVersionLabel(undefined)).toBe('—')
    expect(acceptedVersionLabel(null)).toBe('—')
    expect(acceptedVersionLabel('')).toBe('—')
    expect(acceptedVersionLabel(7)).toBe('—')
  })
})
