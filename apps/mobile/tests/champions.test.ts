import { describe, it, expect } from 'vitest'
import { championIdByName, championJsonUrl, parseChampionJson } from '../src/lib/champions'

const json = {
  type: 'champion',
  version: '15.20.1',
  data: {
    Aatrox: { id: 'Aatrox', key: '266', name: 'Aatrox' },
    Nunu: { id: 'Nunu', key: '20', name: 'Nunu & Willump' },
    MonkeyKing: { id: 'MonkeyKing', key: '62', name: 'Wukong' },
    Chogath: { id: 'Chogath', key: '31', name: "Cho'Gath" },
    Jinx: { id: 'Jinx', key: '222', name: 'Jinx' },
  },
}

describe('champions', () => {
  it('parses the Data Dragon map into id / name / imageKey sorted by name', () => {
    const list = parseChampionJson(json)
    expect(list.map((c) => c.name)).toEqual(['Aatrox', "Cho'Gath", 'Jinx', 'Nunu & Willump', 'Wukong'])
    expect(list.find((c) => c.name === 'Wukong')).toEqual({ id: 62, name: 'Wukong', imageKey: 'MonkeyKing' })
    expect(parseChampionJson(null)).toEqual([])
    expect(parseChampionJson({ data: { Bad: { id: 'Bad', key: 'x', name: 'Bad' } } })).toEqual([])
  })
  it('resolves Live Client display names, including the special ones, to the numeric id', () => {
    const list = parseChampionJson(json)
    expect(championIdByName(list, 'Nunu & Willump')).toBe(20)
    expect(championIdByName(list, 'Wukong')).toBe(62)
    expect(championIdByName(list, "Cho'Gath")).toBe(31)
    expect(championIdByName(list, 'jinx')).toBe(222)
    expect(championIdByName(list, 'Nobody')).toBeNull()
  })
  it('builds the champion.json url for a version', () => {
    expect(championJsonUrl('15.20.1')).toBe('https://ddragon.leagueoflegends.com/cdn/15.20.1/data/en_US/champion.json')
  })
})
