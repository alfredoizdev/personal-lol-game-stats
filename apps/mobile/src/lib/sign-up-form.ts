import { parseRiotId, type Region, type RiotId } from '@lpp/shared'

export type SignUpInput = {
  username: string
  riotId: string
  email: string
  password: string
  confirm: string
  region: Region
  acceptedTerms: boolean
}

export type SignUpValue = {
  username: string
  email: string
  password: string
  region: Region
  riotId: RiotId | null
}

export type SignUpField = 'username' | 'riotId' | 'email' | 'password' | 'confirm' | 'terms'

export type SignUpValidation = { ok: true; value: SignUpValue } | { ok: false; field: SignUpField; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignUp(input: SignUpInput): SignUpValidation {
  const username = input.username.trim()
  const email = input.email.trim().toLowerCase()
  const riotRaw = input.riotId.trim()

  if (username.length < 3) return { ok: false, field: 'username', message: 'Username needs at least 3 characters' }
  let riotId: RiotId | null = null
  if (riotRaw) {
    riotId = parseRiotId(riotRaw)
    if (!riotId) return { ok: false, field: 'riotId', message: 'Enter your Riot ID as Name#TAG' }
  }
  if (!EMAIL_RE.test(email)) return { ok: false, field: 'email', message: 'Enter a valid email' }
  if (input.password.length < 8) return { ok: false, field: 'password', message: 'Password needs at least 8 characters' }
  if (input.password !== input.confirm) return { ok: false, field: 'confirm', message: 'Passwords do not match' }
  if (!input.acceptedTerms) return { ok: false, field: 'terms', message: 'Please accept the Terms and Privacy Policy' }

  return { ok: true, value: { username, email, password: input.password, region: input.region, riotId } }
}
