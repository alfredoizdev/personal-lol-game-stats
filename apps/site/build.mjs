// Static site build: three pages from the shared legal text + a product page.
// Runs on Node ≥ 22.18 (native TypeScript type stripping); no bundler, no dependencies.
import { registerHooks } from 'node:module'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Shared source imports siblings without an extension (`./disclaimer`); Node ESM wants one.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context)
      } catch {
        /* fall through to the plain specifier */
      }
    }
    return next(specifier, context)
  },
})

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..')
const src = join(here, 'src')
const dist = join(here, 'dist')

const legal = await import(pathToFileURL(join(repo, 'packages/shared/src/legal.ts')).href)
const { RIOT_DISCLAIMER } = await import(pathToFileURL(join(repo, 'packages/shared/src/disclaimer.ts')).href)
const { LEGAL_CONTACT, LEGAL_VERSION, TERMS_SECTIONS, PRIVACY_SECTIONS, renderLegalHtml, escapeHtml } = legal

const shell = readFileSync(join(src, 'shell.html'), 'utf8')

function page(title, content, { showFooterDisclaimer }) {
  return shell
    .replaceAll('{{title}}', escapeHtml(title))
    .replace('{{content}}', content)
    .replace('{{footer-disclaimer}}', showFooterDisclaimer ? `<p class="disclaimer">${escapeHtml(RIOT_DISCLAIMER)}</p>` : '')
    .replaceAll('{{contact}}', escapeHtml(LEGAL_CONTACT))
    .replaceAll('{{version}}', LEGAL_VERSION)
}

mkdirSync(join(dist, 'img'), { recursive: true })
cpSync(join(src, 'site.css'), join(dist, 'site.css'))

// Screenshots shown on the product page (taken with the owner's account in earlier phases).
const screenshots = ['phase2-matches.png', 'phase3-review-overview.png', 'phase4-live.png', 'phase6-performance-overview.png']
const shotsDir = join(repo, 'docs/screenshots')
for (const name of screenshots) {
  const from = join(shotsDir, name)
  if (existsSync(from)) cpSync(from, join(dist, 'img', name))
}
const present = existsSync(join(dist, 'img')) ? readdirSync(join(dist, 'img')) : []

const index = readFileSync(join(src, 'index.html'), 'utf8').replace(
  '{{screenshots}}',
  present.map((n) => `<figure><img src="img/${n}" alt="${escapeHtml(n.replace(/\.png$/, '').replace(/^phase\d-/, '').replaceAll('-', ' '))}" loading="lazy"></figure>`).join('\n'),
)

writeFileSync(join(dist, 'index.html'), page('LanePulse', index, { showFooterDisclaimer: true }))
writeFileSync(join(dist, 'terms.html'), page('Terms of Service · LanePulse', renderLegalHtml('Terms of Service', TERMS_SECTIONS), { showFooterDisclaimer: false }))
writeFileSync(join(dist, 'privacy.html'), page('Privacy Policy · LanePulse', renderLegalHtml('Privacy Policy', PRIVACY_SECTIONS), { showFooterDisclaimer: false }))
console.log(`built ${dist}: index.html terms.html privacy.html (+${present.length} images)`)
