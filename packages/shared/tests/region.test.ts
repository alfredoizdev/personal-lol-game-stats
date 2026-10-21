import { expect, test } from 'vitest'
import { REGIONS, REGION_TO_PLATFORM, platformToRegion } from '../src/region'

test('platformToRegion maps a known platform', () => {
  expect(platformToRegion('euw1')).toBe('EUW')
})

test('platformToRegion defaults to NA for null', () => {
  expect(platformToRegion(null)).toBe('NA')
})

test('platformToRegion defaults to NA for unknown', () => {
  expect(platformToRegion('xx')).toBe('NA')
})

test('REGION_TO_PLATFORM has exactly 10 regions', () => {
  expect(Object.keys(REGION_TO_PLATFORM)).toHaveLength(10)
  expect(REGIONS).toHaveLength(10)
})
