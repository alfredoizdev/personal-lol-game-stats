import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { LEGAL_CONTACT, LEGAL_VERSION, type LegalSection } from '@lpp/shared'
import { Disclaimer } from './Disclaimer'
import { colors, font, space } from '@/theme/tokens'

/** Scrollable legal text: one heading + paragraphs per section, version and contact at the end. */
export function LegalDocument({ title, sections }: { title: string; sections: readonly LegalSection[] }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
        {title}
      </Text>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading} maxFontSizeMultiplier={1.4} accessibilityRole="header">
            {s.heading}
          </Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph} maxFontSizeMultiplier={1.6}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.meta} maxFontSizeMultiplier={1.6}>
          Version {LEGAL_VERSION} · Contact {LEGAL_CONTACT}
        </Text>
        <Disclaimer />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.lg, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: font.title - 4, fontWeight: '800', letterSpacing: -0.5, marginBottom: space.sm },
  section: { marginTop: space.md, gap: space.sm },
  heading: { color: colors.text, fontSize: font.body + 1, fontWeight: '700' },
  paragraph: { color: colors.muted, fontSize: font.body - 1, lineHeight: 23 },
  footer: { marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, gap: space.sm },
  meta: { color: colors.muted, fontSize: font.caption },
})
