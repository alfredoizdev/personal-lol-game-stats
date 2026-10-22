import { useState } from 'react'
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg'
import { RANK_EMBLEM } from '@/lib/rank-emblems'
import { metricInfo, rankBenchmarks, type GoalMetric, type GoalReference as Ref, type Role } from '@lpp/shared'
import { linearScale } from '@/lib/chart-geometry'
import { BAR_ENEMY, BAR_YOU } from '@/components/CompareBar'
import { colors, font } from '@/theme/tokens'

const H = 62
const PAD = { left: 12, right: 12 }
const EMBLEM = 26

/**
 * A ruler under the goal stepper: where your number sits against your own
 * average, the opponents you faced, your best game, the role target and the
 * (approximate) typical value per rank. Text in text tokens; markers carry colour.
 */
export function GoalReference({ metric, role, reference, target }: { metric: GoalMetric; role: Role; reference: Ref; target: number | null }) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)
  const info = metricInfo(metric)
  const ladder = rankBenchmarks(metric, role)
  const fmt = (v: number) => `${v.toFixed(info.decimals)}${metric === 'kpPct' ? '%' : ''}`

  const values = [...ladder.map((b) => b.value), reference.you, reference.opponents, reference.best, reference.target, target].filter((v): v is number => v !== null)
  if (values.length === 0) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const padV = (hi - lo || 1) * 0.08
  // Worse on the left, better on the right — so for "fewer is better" metrics the axis runs high → low.
  const domain: [number, number] = info.lowerIsBetter ? [hi + padV, lo - padV] : [lo - padV, hi + padV]
  const x = linearScale(domain, [PAD.left, Math.max(PAD.left + 1, width - PAD.right)])
  // Emblems drop to a second row only when they would overlap the previous one.
  const rows: number[] = []
  const lastX = [-Infinity, -Infinity]
  for (const b of ladder) {
    const px = x(b.value)
    const row = px - lastX[0]! < EMBLEM ? 1 : 0
    const r = row === 1 && px - lastX[1]! < EMBLEM ? 0 : row
    rows.push(r)
    lastX[r] = px
  }

  const markers: Array<{ label: string; value: number; color: string; n?: number }> = []
  if (reference.you !== null) markers.push({ label: 'You', value: reference.you, color: BAR_YOU, n: reference.youN })
  if (reference.opponents !== null) markers.push({ label: 'Opponents', value: reference.opponents, color: BAR_ENEMY, n: reference.opponentsN })
  if (reference.best !== null) markers.push({ label: 'Your best', value: reference.best, color: colors.win })
  if (reference.target !== null) markers.push({ label: 'Role target', value: reference.target, color: colors.accent })

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {/* rank ladder: tick per tier (emblems are drawn below, outside the SVG) */}
          <Line x1={PAD.left} x2={width - PAD.right} y1={54} y2={54} stroke={colors.border} strokeWidth={2} />
          {ladder.map((b) => (
            <Line key={`t${b.tier}`} x1={x(b.value)} x2={x(b.value)} y1={50} y2={58} stroke={colors.muted} strokeWidth={1} />
          ))}
          {/* reference markers */}
          {markers.map((m, i) => (
            <Circle key={m.label} cx={x(m.value)} cy={54} r={5 - (i === 3 ? 1 : 0)} fill={m.color} stroke={colors.surfaceSolid} strokeWidth={2} />
          ))}
          {/* your goal */}
          {target !== null ? (
            <>
              <Rect x={x(target) - 1.5} y={38} width={3} height={32} rx={1.5} fill={colors.text} />
              <SvgText x={x(target)} y={30} fontSize={11} fontWeight="700" fill={colors.text} textAnchor="middle">
                {`Goal ${fmt(target)}`}
              </SvgText>
            </>
          ) : null}
        </Svg>
      ) : null}
      {width > 0 ? (
        <View style={styles.emblems} pointerEvents="none">
          {ladder.map((b, i) => (
            <Image
              key={b.tier}
              source={RANK_EMBLEM[b.tier]}
              accessibilityLabel={`${b.tier} ${fmt(b.value)}`}
              style={[styles.emblem, { left: x(b.value) - EMBLEM / 2, top: rows[i] === 0 ? 0 : EMBLEM * 0.7 }]}
              resizeMode="contain"
            />
          ))}
        </View>
      ) : null}
      <View style={styles.legend}>
        {markers.map((m) => (
          <View key={m.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: m.color }]} />
            <Text style={styles.legendText} maxFontSizeMultiplier={1.15}>
              {m.label} {fmt(m.value)}
              {m.n !== undefined ? ` (${m.n})` : ''}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.note} maxFontSizeMultiplier={1.15}>
        Rank marks are typical {info.label.toLowerCase()} values by tier, worse on the left and better on the right (community estimates, not Riot data). Your own numbers are the ones that matter.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  emblems: { height: EMBLEM * 1.75, marginTop: -4 },
  emblem: { position: 'absolute', width: EMBLEM, height: EMBLEM },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: font.caption - 1 },
  note: { color: colors.muted, fontSize: font.caption - 2, lineHeight: 15 },
})
