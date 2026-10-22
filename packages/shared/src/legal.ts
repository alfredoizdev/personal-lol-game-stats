import { RIOT_DISCLAIMER } from './disclaimer'

/** Bump when the text below changes in substance; stored in user metadata at sign-up. */
export const LEGAL_VERSION = '2026-10-22'
export const LEGAL_CONTACT = 'alfredodevelop@gmail.com'
/* <!-- LEGAL_ENTITY: revisar antes de publicar --> swap for the person or company that answers for the service. */
export const LEGAL_ENTITY = 'LanePulse (an independent developer)'

export type LegalSection = { heading: string; paragraphs: string[] }

const CONTACT_LINE = `Questions go to ${LEGAL_CONTACT}. The service is operated by ${LEGAL_ENTITY}.`

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    heading: 'Acceptance of these terms',
    paragraphs: [
      `These terms are an agreement between you and ${LEGAL_ENTITY} ("we", "us"). They apply to the LanePulse mobile app, the LanePulse desktop companion and the LanePulse website (together, "the service").`,
      'You accept them by creating an account or by using the service. If you do not agree, do not use the service.',
    ],
  },
  {
    heading: 'The service',
    paragraphs: [
      'LanePulse shows you your own League of Legends match history, scores each of your games against role targets, lets you set one goal before a game, shows your own live stats while you play and summarises your recent performance.',
      'Everything LanePulse shows about a game comes from data Riot Games makes available for your own account. LanePulse does not show other players’ private data, does not rank or compare you with other players, does not give in-game tactical instructions and does not change anything in the game.',
      'The service is free. There are no paid tiers, purchases or ads.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You need an email address and a password to create an account, and a Riot ID to see your games. You are responsible for keeping your password private and for what happens under your account.',
      'Link only Riot IDs that belong to you. You can link more than one and switch between them in Profile.',
      'You must be at least 13 years old, or older if the law where you live sets a higher age for using online services without parental consent.',
    ],
  },
  {
    heading: 'Riot Games data and disclaimer',
    paragraphs: [
      'LanePulse uses the Riot Games API to fetch your match history and match details, and the local Live Client Data API on your computer to read the live stats of the game you are playing. We use this data only to show it back to you.',
      RIOT_DISCLAIMER,
      'Riot Games may change or restrict its API at any time, which can change what LanePulse is able to show.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: [
      'Do not use the service to gain an unfair advantage in a game, to scrape or redistribute data from the Riot Games API, to access accounts that are not yours, or to interfere with the service or with other users.',
      'Do not reverse engineer, resell or rebrand the service. Do not use automated tools to create accounts or to flood the service with requests.',
    ],
  },
  {
    heading: 'Availability and changes to the service',
    paragraphs: [
      'The service is provided as it is, when it is. We may add, change or remove features, and we may suspend the service for maintenance or for reasons outside our control, including changes on the Riot Games side.',
      'Match data is cached to reduce the number of requests we make to Riot Games; a game may take a few minutes to appear after it ends.',
    ],
  },
  {
    heading: 'Termination',
    paragraphs: [
      'You can delete your account at any time from Profile. Deleting your account removes your data as described in the Privacy Policy.',
      'We may suspend or close an account that breaks these terms, or if we are required to by Riot Games or by law. We will tell you why when we can.',
    ],
  },
  {
    heading: 'Disclaimer of warranties and limitation of liability',
    paragraphs: [
      'The service is provided without warranties of any kind. Scores, targets and summaries are estimates based on public match data and are meant to help you reflect on your own games; they are not an official rating and are not guaranteed to be accurate, complete or up to date.',
      'To the fullest extent the law allows, we are not liable for any indirect, incidental or consequential loss arising from your use of the service, and our total liability to you for any claim is limited to the amount you paid for the service, which is zero.',
      'Nothing in these terms limits liability that cannot be limited by law.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      `We may update these terms. The version date at the bottom of this page tells you when they last changed (current version: ${LEGAL_VERSION}). If a change is significant we will tell you in the app before it applies. Using the service after a change means you accept the new terms.`,
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [CONTACT_LINE],
  },
]

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `LanePulse is operated by ${LEGAL_ENTITY}. This policy explains what data the service keeps about you, why, where, and how to delete it. ${CONTACT_LINE}`,
    ],
  },
  {
    heading: 'Data we collect',
    paragraphs: [
      'Account: your email address, a hashed password, your display name and the date you accepted the terms. Supabase, our hosting provider, also keeps the session tokens that sign you in.',
      'Riot account: the Riot ID (game name and tag line), the account identifier (puuid) Riot assigns to it, the region and the profile icon, for each Riot ID you link. We fetch these from the Riot Games API when you link an account.',
      'Match data: for the games played on your linked Riot IDs, the match details and, when you open a review, the match timeline, exactly as the Riot Games API returns them. These are cached by match id, not by user, because the same game appears in the history of ten players.',
      'Live game: while the desktop companion runs during a game, it sends a snapshot of your own live stats (CS, kills, deaths, assists, gold, vision, game time) to your phone through a private channel. Snapshots are relayed, not stored; when the game ends they are gone.',
      'Goals and settings: the goal you set before a game, your active Riot ID, and your notification preferences.',
      'Push notifications: only if you turn on goal updates in Profile, the push token Expo assigns to your phone, the platform and the app version, so the desktop companion can send status messages to your phone. Turning it off revokes the token.',
      'Technical: standard request logs kept by Supabase (IP address, timestamps, request path) for security and debugging.',
    ],
  },
  {
    heading: 'Why we use it',
    paragraphs: [
      'To sign you in and keep your account secure; to fetch and show your own match history, scores, live stats and summaries; to send you the goal status messages you opted into; and to answer your support requests.',
      'We do not sell your data, do not use it for advertising, and do not use it to build profiles of other players.',
    ],
  },
  {
    heading: 'Where it is stored',
    paragraphs: [
      'Your data is stored in a Supabase project hosted in the United States. Your phone keeps a copy of the match data it has shown you in memory while the app is open, to avoid repeat requests; nothing is written to disk on your phone or computer beyond your session.',
    ],
  },
  {
    heading: 'Third parties',
    paragraphs: [
      'Riot Games: we send your Riot ID and match ids to the Riot Games API to fetch your account and match data. Riot’s own privacy notice applies to that data.',
      'Supabase: hosts the database, authentication and the functions that call the Riot Games API on our behalf.',
      'Expo: delivers push notifications to your phone through the Expo push service, which forwards them to Apple or Google. Expo receives the push token and the message text.',
      'Vercel: hosts this website. No scripts on this website send data to anyone.',
      'We do not share your data with anyone else, except if the law requires it.',
    ],
  },
  {
    heading: 'Retention',
    paragraphs: [
      'Account, Riot account, goal and notification data are kept while your account exists. Push tokens that stop working are marked revoked and ignored.',
      'Cached match data is kept to avoid re-fetching the same game; it contains no account data of yours beyond what Riot publishes for the match, and it is not linked to your account once your account is deleted.',
      'Live snapshots are never written to the database.',
    ],
  },
  {
    heading: 'Deleting your data',
    paragraphs: [
      'Open Profile and choose "Delete account and data". This deletes your account, your linked Riot accounts, your goals, your notification settings and your push tokens immediately. Cached match data, which is keyed by match id and holds no reference to your account, is not deleted; it is public match data Riot makes available for every player in that game.',
      `You can also ask us to delete your account by writing to ${LEGAL_CONTACT} from the email address on the account.`,
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'The service is not directed at children under 13, and we do not knowingly collect data from them. If you believe a child has created an account, tell us and we will delete it.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      `Depending on where you live, you may have the right to access, correct, export or delete your data, and to object to or restrict how we use it. You can see and delete most of it in the app; for anything else, write to ${LEGAL_CONTACT}. We answer within 30 days.`,
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      `We may update this policy. The version date at the bottom of this page tells you when it last changed (current version: ${LEGAL_VERSION}). If a change affects what we collect or why, we will tell you in the app before it applies.`,
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [CONTACT_LINE],
  },
]

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** HTML body fragment for a legal page: h1, one h2 + paragraphs per section, version/contact footer and the Riot disclaimer. */
export function renderLegalHtml(title: string, sections: readonly LegalSection[]): string {
  const body = sections
    .map((s) => [`<h2>${escapeHtml(s.heading)}</h2>`, ...s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`)].join('\n'))
    .join('\n')
  return [
    `<h1>${escapeHtml(title)}</h1>`,
    body,
    `<footer class="legal-footer"><p>Version ${LEGAL_VERSION} · Contact ${escapeHtml(LEGAL_CONTACT)}</p><p class="disclaimer">${escapeHtml(RIOT_DISCLAIMER)}</p></footer>`,
  ].join('\n')
}
