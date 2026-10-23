import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { AREA_WEIGHTS, ANALYZABLE_QUEUES, BASELINE_MIN_GAMES, DIFF_CURVES, ROLE_TARGETS, SUBROW_WEIGHTS, queueLabel, type Role } from '@lpp/shared'
import { Disclaimer } from '@/components/Disclaimer'
import { ScoreCurveChart } from '@/components/ScoreCurveChart'
import { WeightBar } from '@/components/WeightBar'
import { diffCurvePoints, ratioCurvePoints } from '@/lib/score-curve'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }
const AREA_LABEL: Record<string, string> = { farming: 'Farming', combat: 'Combat', lane: 'Lane', vision: 'Vision' }

/** The same facts as docs/ANALYSIS.md, drawn rather than described, for the role of the match the reader came from. */
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
          <View style={styles.headerText}>
            <Text style={styles.title} maxFontSizeMultiplier={1.15}>How it's scored</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[role]} · every number can be checked by hand</Text>
          </View>
        </View>

        <Section title={`Targets for ${ROLE_LABEL[role]}`} hint="Scores come only from these. Your opponent and your own average are shown next to them and never change a score.">
          <Line k="CS / min" v={t.csPerMin === null ? 'not scored' : t.csPerMin.toFixed(1)} />
          <Line k="Vision score / min" v={t.visionPerMin.toFixed(2)} />
          <Line k="Wards placed / min" v={t.wardsPerMin.toFixed(2)} />
          <Line k="Deaths per 10 min" v={`≤ ${t.deathsPer10Max.toFixed(1)}`} />
          <Line k="Kill participation" v={`${t.kpPct}%`} />
        </Section>

        <Section title="From your number to a score" hint="Hit the target → 70. Thirty percent above it → 100. Half of it → 0. Deaths work the other way round: fewer is better, zero deaths is 100.">
          <ScoreCurveChart points={ratioCurvePoints()} marks={[0.5, 1, 1.3]} xLabel="your value ÷ target" formatX={(x) => `${x.toFixed(1)}×`} />
        </Section>

        <Section title="Lane leads" hint={`CS lead against your lane opponent at 10 and 15 minutes. Gold uses ±${DIFF_CURVES.gold.ceil} and XP ±${DIFF_CURVES.xp.ceil} the same way.`}>
          <ScoreCurveChart points={diffCurvePoints('cs')} marks={[DIFF_CURVES.cs.floor, 0, DIFF_CURVES.cs.ceil]} xLabel="your CS − opponent's CS" formatX={(x) => (x > 0 ? `+${x}` : String(x))} />
        </Section>

        <Section title="Weights" hint="Each area is the weighted mean of its rows; the match score is the weighted mean of the areas. Missing rows and hidden areas drop out and the rest renormalize.">
          <WeightBar title="Match score" segments={Object.entries(weights).map(([k, w]) => ({ label: AREA_LABEL[k] ?? k, weight: w }))} />
          {t.csPerMin !== null ? (
            <WeightBar
              title="Farming"
              segments={[
                { label: 'CS/min', weight: SUBROW_WEIGHTS.farming.total },
                { label: 'Lane 0–14', weight: SUBROW_WEIGHTS.farming.lane },
                { label: 'Mid 14–25', weight: SUBROW_WEIGHTS.farming.mid },
                { label: 'Late 25+', weight: SUBROW_WEIGHTS.farming.late },
              ]}
            />
          ) : null}
          <WeightBar title="Combat" segments={[{ label: 'Kill participation', weight: SUBROW_WEIGHTS.combat.kp }, { label: 'Deaths', weight: SUBROW_WEIGHTS.combat.deaths }]} />
          <WeightBar title="Vision" segments={[{ label: 'Vision score', weight: SUBROW_WEIGHTS.vision.visionPerMin }, { label: 'Wards', weight: SUBROW_WEIGHTS.vision.wardsPerMin }]} />
          <WeightBar
            title="Lane"
            segments={role === 'UTILITY' ? [{ label: 'Gold', weight: 50 }, { label: 'XP', weight: 50 }] : [{ label: 'CS', weight: 33 }, { label: 'Gold', weight: 33 }, { label: 'XP', weight: 34 }]}
          />
        </Section>

        <Section title='"vs you"' hint={`Your average over the games in this role among your last 20, excluding remakes and the game you are reading. Right now: ${n} games${n < BASELINE_MIN_GAMES ? ` (fewer than ${BASELINE_MIN_GAMES}, so "vs you" stays hidden)` : ''}.`} />

        <Section title="What is analyzed" hint={`${[...ANALYZABLE_QUEUES].map((q) => queueLabel(q)).join(' · ')}. Remakes, bot games, ARAM and Arena are not scored.`} />

        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>{title}</Text>
      {children}
      {hint ? <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{hint}</Text> : null}
    </View>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.k} maxFontSizeMultiplier={1.15}>{k}</Text>
      <Text style={styles.v} maxFontSizeMultiplier={1.15}>{v}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headerText: { flex: 1 },
  back: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 28, lineHeight: 30, marginTop: -4 },
  title: { color: colors.text, fontSize: font.title - 6, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.caption },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  k: { color: colors.muted, fontSize: font.body - 2, flexShrink: 0 },
  v: { color: colors.text, fontSize: font.body - 2, fontWeight: '700', textAlign: 'right', flex: 1 },
  muted: { color: colors.muted, fontSize: font.caption, lineHeight: 18 },
  footer: { paddingBottom: space.lg },
})
