import { describe, it, expect } from 'vitest'
import {
  LEGAL_VERSION,
  LEGAL_CONTACT,
  LEGAL_ENTITY,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  renderLegalHtml,
} from '../src/legal'
import { RIOT_DISCLAIMER } from '../src/disclaimer'

describe('legal text', () => {
  it('pins the version, contact and entity the spec fixes', () => {
    expect(LEGAL_VERSION).toBe('2026-10-22')
    expect(LEGAL_CONTACT).toBe('alfredodevelop@gmail.com')
    expect(LEGAL_ENTITY).toBe('LanePulse (an independent developer)')
  })

  it('has at least 8 terms sections and 9 privacy sections, each with a heading and text', () => {
    expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(8)
    expect(PRIVACY_SECTIONS.length).toBeGreaterThanOrEqual(9)
    for (const s of [...TERMS_SECTIONS, ...PRIVACY_SECTIONS]) {
      expect(s.heading.trim().length).toBeGreaterThan(0)
      expect(s.paragraphs.length).toBeGreaterThan(0)
      for (const p of s.paragraphs) expect(p.trim().length).toBeGreaterThan(0)
    }
  })

  it('leaves no TBD anywhere', () => {
    for (const s of [...TERMS_SECTIONS, ...PRIVACY_SECTIONS]) {
      expect(s.heading).not.toMatch(/TBD/i)
      for (const p of s.paragraphs) expect(p).not.toMatch(/\bTBD\b/i)
    }
  })

  it('names the contact and the entity in both documents', () => {
    const terms = TERMS_SECTIONS.flatMap((s) => s.paragraphs).join('\n')
    const privacy = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join('\n')
    expect(terms).toContain(LEGAL_CONTACT)
    expect(privacy).toContain(LEGAL_CONTACT)
    expect(terms).toContain(LEGAL_ENTITY)
    expect(privacy).toContain(LEGAL_ENTITY)
  })

  it('privacy covers the data the app actually stores', () => {
    const privacy = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join('\n')
    for (const needle of ['Riot ID', 'push', 'Supabase', 'Expo', 'delete', '13']) {
      expect(privacy).toContain(needle)
    }
  })
})

describe('renderLegalHtml', () => {
  const html = renderLegalHtml('Terms of Service', TERMS_SECTIONS)

  it('renders one h1, one h2 per section and the paragraphs', () => {
    expect(html.match(/<h1>/g)?.length).toBe(1)
    expect(html.match(/<h2>/g)?.length).toBe(TERMS_SECTIONS.length)
    expect(html).toContain('<h1>Terms of Service</h1>')
    expect(html).toContain(`<p>${TERMS_SECTIONS[0]!.paragraphs[1]}</p>`)
  })

  it('carries the version, the contact and the Riot disclaimer', () => {
    expect(html).toContain(LEGAL_VERSION)
    expect(html).toContain(LEGAL_CONTACT)
    expect(html).toContain(RIOT_DISCLAIMER)
  })

  it('escapes html special characters in the text', () => {
    const out = renderLegalHtml('A & B', [{ heading: '<x>', paragraphs: ['a < b'] }])
    expect(out).toContain('<h1>A &amp; B</h1>')
    expect(out).toContain('<h2>&lt;x&gt;</h2>')
    expect(out).toContain('<p>a &lt; b</p>')
  })
})
