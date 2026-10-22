import { useMemo, useState } from 'react'
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { separatedEndLabels, type TrendPoint } from '@/lib/live-trend'
import { colors, font, radius, space } from '@/theme/tokens'

// Series colours validated with the dataviz palette checker (dark surface #1B1742):
// L inside 0.48–0.67, CVD ΔE 12.3, contrast ≥ 3:1. Text stays in text tokens.
export const TREND_YOU = '#0E9DB5'
export const TREND_ENEMY = '#E8486F'

const H = 150
const PAD = { top: 12, right: 44, bottom: 24, left: 30 }

export function LiveTrendChart({ points }: { points: TrendPoint[] }) {
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  const geom = useMemo(() => {
    if (points.length < 2 || width === 0) return null
    const w = width - PAD.left - PAD.right
    const h = H - PAD.top - PAD.bottom
    const minutes = points.map((p) => p.minute)
    const x0 = Math.min(...minutes)
    const x1 = Math.max(...minutes)
    const values = points.flatMap((p) => [p.me, p.enemy]).filter((v): v is number => v !== null)
    const yMax = Math.max(4, Math.ceil(Math.max(...values) + 0.5))
    const x = (m: number) => PAD.left + ((m - x0) / Math.max(1, x1 - x0)) * w
    const y = (v: number) => PAD.top + h - (v / yMax) * h
    const path = (key: 'me' | 'enemy') => {
      let d = ''
      for (const p of points) {
        const v = p[key]
        if (v === null) continue
        d += `${d ? ' L' : 'M'}${x(p.minute).toFixed(1)} ${y(v).toFixed(1)}`
      }
      return d
    }
    const ticks = [0, yMax / 2, yMax]
    return { w, h, x, y, yMax, ticks, me: path('me'), enemy: path('enemy'), x0, x1 }
  }, [points, width])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Only claim horizontal drags; a vertical swipe that starts on the chart must scroll the screen.
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
    points.forEach((p, i) => {
      const d = Math.abs(geom.x(p.minute) - px)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setHover(best)
  }

  const last = points[points.length - 1]
  const endLabels = last && geom ? separatedEndLabels(last.me === null ? null : geom.y(last.me), last.enemy === null || last.enemy === undefined ? null : geom.y(last.enemy)) : { me: 0, enemy: 0 }
  const hovered = hover !== null ? points[hover] : null

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>CS / min trend</Text>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: TREND_YOU }]} />
          <Text style={styles.legendText}>You</Text>
          <View style={[styles.swatch, { backgroundColor: TREND_ENEMY }]} />
          <Text style={styles.legendText}>Enemy</Text>
        </View>
      </View>
      <View onLayout={onLayout} {...pan.panHandlers}>
        {geom ? (
          <Svg width={width} height={H}>
            {geom.ticks.map((t) => (
              <Line key={t} x1={PAD.left} x2={PAD.left + geom.w} y1={geom.y(t)} y2={geom.y(t)} stroke={colors.border} strokeWidth={1} />
            ))}
            {geom.ticks.map((t) => (
              <SvgText key={`l${t}`} x={PAD.left - 6} y={geom.y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
                {t.toFixed(0)}
              </SvgText>
            ))}
            <SvgText x={PAD.left} y={H - 6} fontSize={10} fill={colors.muted}>{`${geom.x0} min`}</SvgText>
            <SvgText x={PAD.left + geom.w} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="end">{`${geom.x1} min`}</SvgText>
            <Path d={geom.enemy} stroke={TREND_ENEMY} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Path d={geom.me} stroke={TREND_YOU} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {last?.enemy !== null && last?.enemy !== undefined ? (
              <>
                <Circle cx={geom.x(last.minute)} cy={geom.y(last.enemy)} r={5} fill={TREND_ENEMY} stroke={colors.surfaceSolid} strokeWidth={2} />
                <SvgText x={geom.x(last.minute) + 8} y={endLabels.enemy} fontSize={11} fontWeight="700" fill={colors.text}>{last.enemy.toFixed(1)}</SvgText>
              </>
            ) : null}
            {last && last.me !== null ? (
              <>
                <Circle cx={geom.x(last.minute)} cy={geom.y(last.me)} r={5} fill={TREND_YOU} stroke={colors.surfaceSolid} strokeWidth={2} />
                <SvgText x={geom.x(last.minute) + 8} y={endLabels.me} fontSize={11} fontWeight="700" fill={colors.text}>{last.me.toFixed(1)}</SvgText>
              </>
            ) : null}
            {hovered ? (
              <>
                <Line x1={geom.x(hovered.minute)} x2={geom.x(hovered.minute)} y1={PAD.top} y2={PAD.top + geom.h} stroke={colors.muted} strokeWidth={1} strokeDasharray="3 3" />
                <Rect x={Math.min(geom.x(hovered.minute) + 6, width - 96)} y={PAD.top} width={90} height={hovered.enemy === null ? 22 : 36} rx={6} fill={colors.surfaceSolid} stroke={colors.border} />
                <SvgText x={Math.min(geom.x(hovered.minute) + 12, width - 90)} y={PAD.top + 15} fontSize={11} fill={colors.text}>{`${hovered.minute} min · You ${hovered.me ?? '—'}`}</SvgText>
                {hovered.enemy !== null ? (
                  <SvgText x={Math.min(geom.x(hovered.minute) + 12, width - 90)} y={PAD.top + 29} fontSize={11} fill={colors.text}>{`Enemy ${hovered.enemy}`}</SvgText>
                ) : null}
              </>
            ) : null}
          </Svg>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.muted}>Trend appears after the second minute.</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginLeft: 6 },
  legendText: { color: colors.muted, fontSize: font.caption },
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
})
