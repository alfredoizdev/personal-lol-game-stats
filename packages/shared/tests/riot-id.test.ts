import { expect, test } from 'vitest'
import { parseRiotId, formatRiotId } from '../src/riot-id'

test('splits on last # and trims', () => {
  expect(parseRiotId(' Hide on bush #KR1 ')).toEqual({ gameName: 'Hide on bush', tagLine: 'KR1' })
})

test('game name may contain #', () => {
  expect(parseRiotId('a#b#NA1')).toEqual({ gameName: 'a#b', tagLine: 'NA1' })
})

test('rejects missing halves', () => {
  expect(parseRiotId('NoTag')).toBeNull()
  expect(parseRiotId('#NA1')).toBeNull()
  expect(parseRiotId('Name#')).toBeNull()
})

test('format', () => {
  expect(formatRiotId('Name', 'TAG')).toBe('Name#TAG')
})
