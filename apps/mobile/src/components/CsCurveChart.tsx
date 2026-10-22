import { useMemo, useState } from 'react'
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { PhaseKey } from '@lpp/shared'
import { linePath, linearScale, niceMax, phaseBands } from '@/lib/chart-geometry'
import { BAR_ENEMY, BAR_YOU } from './CompareBar'
import { colors, font, space } from '@/theme/tokens'

type Point = { t: number; me: number | null; enemy: number | null }

const H = 170
const PAD = { top: 14, right: 40, bottom: 24, left: 34 }
const PHASE_LABEL: Record<PhaseKey, string> = { lane: 'Lane', mid: 'Mid', late: 'Late' }

/** Cumulative CS per minute, you vs lane opponent, with the three phases marked and the weakest shaded. */
export function CsCurveChart({ curve, durationSec, weakestPhase }: { curve: Point[]; durationSec: number; weakestPhase: PhaseKey | null }) {
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  const geom = useMemo(() => {
    if (curve.length < 2 || width === 0) return null
    const w = width - PAD.left - PAD.right
    const h = H - PAD.top - PAD.bottom
    const yMax = niceMax(curve.flatMap((p) => [p.me ?? 0, p.enemy ?? 0]), 50)
    const x = linearScale([0, Math.max(durationSec, 60)], [PAD.left, PAD.left + w])
    const y = linearScale([0, yMax], [PAD.top + h, PAD.top])
    return {
      w,
      h,
      x,
      y,
      yMax,
      me: linePath(curve.map((p) => ({ x: x(p.t), y: p.me === null ? null : y(p.me) }))),
      enemy: linePath(curve.map((p) => ({ x: x(p.t), y: p.enemy === null ? null : y(p.enemy) }))),
      bands: phaseBands(durationSec),
    }
  }, [curve, width, durationSec])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
        onPanResponderRelease: () => setHover(null),
        onPanResponderTerminate: () => setHover(null),
      }),
    [geom],
  )

  function pick(px: number) {
    if (!geom) return
    let best = 0
    let bestD = Infinity
    curve.forEach((p, i) => {
      const d = Math.abs(geom.x(p.t) - px)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setHover(best)
  }

  const last = curve[curve.length - 1]
  const hovered = hover !== null ? curve[hover] : null
  const hasEnemy = curve.some((p) => p.enemy !== null)

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>CS over the game</Text>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: BAR_YOU }]} />
          <Text style={styles.legendText}>You</Text>
          {hasEnemy ? (
            <>
              <View style={[styles.swatch, { backgroundColor: BAR_ENEMY }]} />
              <Text style={styles.legendText}>Enemy</Text>
            </>
          ) : null}
        </View>
      </View>
      <View onLayout={onLayout} {...pan.panHandlers}>
        {geom ? (
          <Svg width={width} height={H}>
            {geom.bands.map((b) => (
              <Rect
                key={b.key}
                x={geom.x(b.startSec)}
                y={PAD.top}
                width={Math.max(0, geom.x(b.endSec) - geom.x(b.startSec))}
                height={geom.h}
                fill={b.key === weakestPhase ? 'rgba(232,72,111,0.12)' : 'transparent'}
              />
            ))}
            {geom.bands.slice(1).map((b) => (
              <Line key={`l${b.key}`} x1={geom.x(b.startSec)} x2={geom.x(b.startSec)} y1={PAD.top} y2={PAD.top + geom.h} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
            ))}
            {geom.bands.map((b) => (
              <SvgText key={`t${b.key}`} x={(geom.x(b.startSec) + geom.x(b.endSec)) / 2} y={PAD.top + 10} fontSize={10} fill={colors.muted} textAnchor="middle">
                {PHASE_LABEL[b.key]}
              </SvgText>
            ))}
            {[0, geom.yMax / 2, geom.yMax].map((v) => (
              <SvgText key={`y${v}`} x={PAD.left - 6} y={geom.y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
                {Math.round(v)}
              </SvgText>
            ))}
            <Line x1={PAD.left} x2={PAD.left + geom.w} y1={geom.y(0)} y2={geom.y(0)} stroke={colors.border} strokeWidth={1} />
            <SvgText x={PAD.left} y={H - 6} fontSize={10} fill={colors.muted}>0 min</SvgText>
            <SvgText x={PAD.left + geom.w} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="end">{`${Math.round(durationSec / 60)} min`}</SvgText>
            <Path d={geom.enemy} stroke={BAR_ENEMY} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Path d={geom.me} stroke={BAR_YOU} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {last && last.enemy !== null ? <Circle cx={geom.x(last.t)} cy={geom.y(last.enemy)} r={4} fill={BAR_ENEMY} stroke={colors.surfaceSolid} strokeWidth={2} /> : null}
            {last && last.me !== null ? <Circle cx={geom.x(last.t)} cy={geom.y(last.me)} r={4} fill={BAR_YOU} stroke={colors.surfaceSolid} strokeWidth={2} /> : null}
            {hovered ? (
              <>
                <Line x1={geom.x(hovered.t)} x2={geom.x(hovered.t)} y1={PAD.top} y2={PAD.top + geom.h} stroke={colors.muted} strokeWidth={1} strokeDasharray="3 3" />
                <Rect x={Math.min(geom.x(hovered.t) + 6, width - 110)} y={PAD.top + 14} width={104} height={hovered.enemy === null ? 22 : 36} rx={6} fill={colors.surfaceSolid} stroke={colors.border} />
                <SvgText x={Math.min(geom.x(hovered.t) + 12, width - 104)} y={PAD.top + 29} fontSize={11} fill={colors.text}>{`${Math.round(hovered.t / 60)} min · You ${hovered.me ?? '—'}`}</SvgText>
                {hovered.enemy !== null ? (
                  <SvgText x={Math.min(geom.x(hovered.t) + 12, width - 104)} y={PAD.top + 43} fontSize={11} fill={colors.text}>{`Enemy ${hovered.enemy}`}</SvgText>
                ) : null}
              </>
            ) : null}
          </Svg>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.muted}>Not enough timeline data.</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginLeft: 6 },
  legendText: { color: colors.muted, fontSize: font.caption },
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
})
