import { PRIVACY_SECTIONS } from '@lpp/shared'
import { LegalDocument } from '@/components/LegalDocument'

export default function PrivacyScreen() {
  return <LegalDocument title="Privacy Policy" sections={PRIVACY_SECTIONS} />
}
