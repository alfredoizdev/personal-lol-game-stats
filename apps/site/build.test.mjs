import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, 'dist')
const DISCLAIMER_START = "LanePulse isn't endorsed by Riot Games"

test('build.mjs writes index, terms and privacy with the disclaimer and safe external links', () => {
  rmSync(dist, { recursive: true, force: true })
  execFileSync(process.execPath, [join(here, 'build.mjs')], { stdio: 'pipe' })
  for (const name of ['index.html', 'terms.html', 'privacy.html']) {
    const file = join(dist, name)
    assert.ok(existsSync(file), `${name} missing`)
    const html = readFileSync(file, 'utf8')
    assert.ok(html.startsWith('<!doctype html>'), `${name} is a full document`)
    assert.ok(html.includes(DISCLAIMER_START), `${name} carries the Riot disclaimer`)
    assert.ok(!/<script/i.test(html), `${name} ships no scripts`)
    for (const m of html.matchAll(/<a [^>]*href="https?:\/\/[^"]+"[^>]*>/g)) {
      assert.ok(m[0].includes('rel="noopener"'), `external link without noopener in ${name}: ${m[0]}`)
    }
  }
  const index = readFileSync(join(dist, 'index.html'), 'utf8')
  assert.ok(index.includes('href="terms.html"') && index.includes('href="privacy.html"'), 'index links the legal pages')
  assert.ok(index.includes('alfredodevelop@gmail.com'), 'index shows the contact')
  assert.ok(existsSync(join(dist, 'img')), 'screenshots copied to dist/img')
  const terms = readFileSync(join(dist, 'terms.html'), 'utf8')
  assert.ok(terms.includes('<h1>Terms of Service</h1>'))
  assert.ok(terms.includes('2026-10-22'), 'terms shows the legal version')
})
