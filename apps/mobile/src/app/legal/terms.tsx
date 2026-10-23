import { TERMS_SECTIONS } from '@lpp/shared'
import { LegalDocument } from '@/components/LegalDocument'

export default function TermsScreen() {
  return <LegalDocument title="Terms of Service" sections={TERMS_SECTIONS} />
}
