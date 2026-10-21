import { describe, it, expect } from 'vitest'
import { championImageKey, championIconUrl, itemIconUrl, profileIconUrl, DDRAGON_FALLBACK_VERSION } from '../src/ddragon'

describe('championImageKey', () => {
  it('maps the names whose image key differs from the display name', () => {
    expect(championImageKey('Wukong')).toBe('MonkeyKing')
    expect(championImageKey('Nunu & Willump')).toBe('Nunu')
    expect(championImageKey('Renata Glasc')).toBe('Renata')
    expect(championImageKey("Cho'Gath")).toBe('Chogath')
    expect(championImageKey("Kai'Sa")).toBe('Kaisa')
    expect(championImageKey("Kha'Zix")).toBe('Khazix')
    expect(championImageKey("Vel'Koz")).toBe('Velkoz')
    expect(championImageKey("Rek'Sai")).toBe('RekSai')
    expect(championImageKey("Kog'Maw")).toBe('KogMaw')
    expect(championImageKey("Bel'Veth")).toBe('Belveth')
    expect(championImageKey("K'Sante")).toBe('KSante')
    expect(championImageKey('Dr. Mundo')).toBe('DrMundo')
    expect(championImageKey('Jarvan IV')).toBe('JarvanIV')
    expect(championImageKey('LeBlanc')).toBe('Leblanc')
    expect(championImageKey('FiddleSticks')).toBe('Fiddlesticks')
    expect(championImageKey('Fiddlesticks')).toBe('Fiddlesticks')
  })
  it('strips spaces, apostrophes and dots generically', () => {
    expect(championImageKey('Lee Sin')).toBe('LeeSin')
    expect(championImageKey('Miss Fortune')).toBe('MissFortune')
    expect(championImageKey('Aurelion Sol')).toBe('AurelionSol')
  })
  it('passes through keys that are already image keys', () => {
    expect(championImageKey('MonkeyKing')).toBe('MonkeyKing')
    expect(championImageKey('Yasuo')).toBe('Yasuo')
  })
})

describe('urls', () => {
  it('builds Data Dragon urls', () => {
    expect(championIconUrl('15.20.1', 'Wukong')).toBe('https://ddragon.leagueoflegends.com/cdn/15.20.1/img/champion/MonkeyKing.png')
    expect(itemIconUrl('15.20.1', 3031)).toMatch(/\/15\.20\.1\/img\/item\/3031\.png$/)
    expect(profileIconUrl('15.20.1', 4321)).toMatch(/\/15\.20\.1\/img\/profileicon\/4321\.png$/)
    expect(DDRAGON_FALLBACK_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
