import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { AREA_WEIGHTS, ANALYZABLE_QUEUES, BASELINE_MIN_GAMES, DIFF_CURVES, ROLE_TARGETS, SUBROW_WEIGHTS, queueLabel, type Role } from '@lpp/shared'
import { Disclaimer } from '@/components/Disclaimer'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

/** The same facts as docs/ANALYSIS.md, for the role of the match the reader came from. */
export default function HowScoredScreen() {
  const params = useLocalSearchParams<{ role?: string; n?: string }>()
  const role: Role = ROLES.includes(params.role as Role) ? (params.role as Role) : 'MIDDLE'
  const n = Number(params.n ?? 0)
  const t = ROLE_TARGETS[role]
  const weights = AREA_WEIGHTS[role]

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/matches'))} hitSlop={10} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>How it's scored</Text>
            <Text style={styles.subtitle}>{ROLE_LABEL[role]} · every number is reproducible by hand</Text>
          </View>
        </View>

        <Section title={`Targets for ${ROLE_LABEL[role]}`}>
          <Line k="CS / min" v={t.csPerMin === null ? 'not scored' : t.csPerMin.toFixed(1)} />
          <Line k="Vision score / min" v={t.visionPerMin.toFixed(2)} />
          <Line k="Wards placed / min" v={t.wardsPerMin.toFixed(2)} />
          <Line k="Deaths per 10 min (good ceiling)" v={t.deathsPer10Max.toFixed(1)} />
          <Line k="Kill participation" v={`${t.kpPct}%`} />
          <Text style={styles.muted}>Scores come only from these targets. Your opponent and your own average are shown as deltas and never change a score.</Text>
        </Section>

        <Section title="The curve">
          <Text style={styles.body}>value ÷ target: 0.5 → 0, 1.0 → 70, 1.3 → 100, straight lines in between. Deaths flip the ratio (fewer is better); zero deaths scores 100.</Text>
          <Text style={styles.body}>
            Lane leads (you − opponent at 10 and 15 min): CS {DIFF_CURVES.cs.floor} → 0, 0 → 60, +{DIFF_CURVES.cs.ceil} → 100 · gold ±{DIFF_CURVES.gold.ceil} · XP ±{DIFF_CURVES.xp.ceil}.
          </Text>
          <Text style={styles.body}>Poor under 40 · Fair 40–59 · Good 60–79 · Great 80+.</Text>
        </Section>

        <Section title="Weights">
          <Line k="Areas" v={Object.entries(weights).map(([k, w]) => `${k} ${w}`).join(' · ')} />
          <Line k="Farming" v={`total ${SUBROW_WEIGHTS.farming.total} · lane ${SUBROW_WEIGHTS.farming.lane} · mid ${SUBROW_WEIGHTS.farming.mid} · late ${SUBROW_WEIGHTS.farming.late}`} />
          <Line k="Combat" v={`kill participation ${SUBROW_WEIGHTS.combat.kp} · deaths ${SUBROW_WEIGHTS.combat.deaths}`} />
          <Line k="Vision" v={`vision score ${SUBROW_WEIGHTS.vision.visionPerMin} · wards ${SUBROW_WEIGHTS.vision.wardsPerMin}`} />
          <Line k="Lane" v={role === 'UTILITY' ? 'gold · XP (equal)' : 'CS · gold · XP (equal)'} />
          <Text style={styles.muted}>Phases: lane 0–14 min, mid 14–25, late 25+. A phase counts after 2 minutes into it. Missing rows and hidden areas drop out and the rest renormalize.</Text>
        </Section>

        <Section title='"vs you"'>
          <Text style={styles.body}>
            Your average over your last 20 games in this role, excluding remakes and the game you are reading. Right now: {n} games{n < BASELINE_MIN_GAMES ? ` (fewer than ${BASELINE_MIN_GAMES}, so "vs you" is hidden)` : ''}.
          </Text>
        </Section>

        <Section title="What is analyzed">
          <Text style={styles.body}>{[...ANALYZABLE_QUEUES].map((q) => queueLabel(q)).join(' · ')}. Remakes, bot games, ARAM and Arena are not scored.</Text>
        </Section>

        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 28, lineHeight: 30, marginTop: -4 },
  title: { color: colors.text, fontSize: font.title - 4, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.caption + 1 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  k: { color: colors.muted, fontSize: font.body - 1, flexShrink: 0 },
  v: { color: colors.text, fontSize: font.body - 1, fontWeight: '700', textAlign: 'right', flex: 1 },
  body: { color: colors.text, fontSize: font.body - 1, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: font.caption + 1, lineHeight: 19 },
  footer: { paddingBottom: space.lg },
})
