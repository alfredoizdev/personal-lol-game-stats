# Fase 3 — Análisis de partida con puntuaciones explicables (diseño)

Fecha: 2026-10-22. Complementa y sustituye la sección 7 del diseño general
(`2026-10-21-lol-personal-performance-v2-design.md`). Aprobado en conversación
por el product owner el 2026-10-22 ("ok hazlo") sobre la propuesta de la sección 2.

## 1. Intención y por qué

Hoy Match Review enseña números sueltos (197 CS, 4.7 CS/min, 42.1K de daño).
Palabras del product owner: "estos números no representan nada, no hay un por
qué". La referencia que le convence es la tarjeta de Mobalytics: un medio anillo
con una puntuación de 0 a 100, el nombre del área, una valoración en una
palabra y, debajo, las subfilas que explican de dónde sale el número.

La Fase 3 convierte cada partida en **cuatro áreas puntuadas y explicadas**, con
una frase humana que dice qué pasó y contra qué se compara. Nunca un número sin
su porqué.

## 2. Qué se construye

### 2.1 Áreas

Cada área es una tarjeta con semi-donut (0–100 dentro del anillo), nombre y
valoración (`Poor` < 40, `Fair` 40–59, `Good` 60–79, `Great` ≥ 80) y debajo sus
subfilas con una barra cada una.

| Área | Subfilas (métrica → de dónde sale) |
|---|---|
| **Farming** | CS/min total (Match-v5). CS en fase de línea 0–14 min, mid 14–25, late 25–fin (timeline). Cada tramo muestra tu CS/min del tramo frente al del oponente de línea. |
| **Combat** | KDA; participación en kills (KP %, `null` si el equipo tiene 0 kills); muertes por 10 min; daño a campeones por minuto frente al oponente. |
| **Vision** | Vision score por minuto; wards colocadas por minuto; wards destruidas (Match-v5 `visionScore`, `wardsPlaced`, `wardsKilled`). |
| **Lane** | Diferencia de CS, oro y XP contra tu oponente de línea a los 10 y 15 min (timeline). Si no hay oponente con tu misma `teamPosition`, el área se oculta y se dice por qué. |

Para `UTILITY` (support) Farming no se puntúa: la tarjeta se muestra en gris con
"No cuenta para supports" y la nota global se calcula sin ella.

### 2.2 Puntuación (mi decisión, documentada en `docs/ANALYSIS.md`)

- **Las puntuaciones salen de objetivos fijos por rol**, los que usan los coaches
  y que podemos citar. Son explicables y no cambian de un día a otro. Valores
  iniciales (el builder los deja en una sola tabla editable):

  | Métrica | TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY |
  |---|---|---|---|---|---|
  | CS/min objetivo | 7.0 | 5.5 | 7.0 | 7.5 | — |
  | Vision score/min objetivo | 0.6 | 1.0 | 0.6 | 0.6 | 2.0 |
  | Wards/min objetivo | 0.25 | 0.4 | 0.25 | 0.25 | 0.9 |
  | Muertes por 10 min (máximo "bueno") | 1.5 | 1.5 | 1.5 | 1.5 | 1.8 |
  | KP % objetivo | 45 | 60 | 55 | 55 | 60 |

- Cada métrica se convierte a 0–100 con una curva fija: ratio `valor / objetivo`
  0.5 → 0, 1.0 → 70, 1.3 → 100, lineal a trozos y recortada. Para métricas
  "menos es mejor" (muertes) se invierte. Para las diferencias de línea
  (CS/oro/XP a 10 y 15) la escala es: −40 CS → 0, 0 → 60, +25 CS → 100 (y
  equivalentes en oro ±1 500 y XP ±1 000).
- La puntuación del área es la media ponderada de sus subfilas; la nota global
  de la partida es la media ponderada de las áreas por rol (support: Vision 40,
  Combat 30, Lane 30; resto: Farming 35, Combat 30, Lane 20, Vision 15). Pesos
  en la misma tabla editable.
- **Las comparaciones no mueven la nota; la explican.** Debajo de cada subfila
  se muestran dos deltas cuando existen: "vs oponente" (misma partida) y "vs tú"
  (tu media de las últimas N partidas en ese rol, N ≤ 20, se muestra el N; con
  N < 3 se etiqueta "pocas partidas"). Así una nota nunca depende de datos que
  no tenemos (no hay millones de partidas por rango como en Mobalytics) y el
  usuario ve contra qué se le compara.

### 2.3 La frase

Cada área lleva una frase de una línea generada con plantilla a partir de su
subfila más floja, siempre con el número concreto y la referencia: "Farmeo
flojo en late game: 17 minions menos que tu oponente entre el 25 y el 42".
Nunca consejo táctico ni "probabilidad de ganar": no tenemos modelo y la
política de Riot lo prohíbe en vivo. Encima de todas las áreas, una frase global
con el área más baja ("Lo que más te frena: Vision").

### 2.4 Gráfico

En Farming: CS acumulado por minuto, tú (cian) contra tu oponente (rojo), con las
tres fases marcadas con líneas verticales sutiles y la fase más floja sombreada,
como en la referencia. Mismo componente SVG que el trend del Live, reutilizado.
En Lane: pequeño gráfico de la diferencia de oro por minuto (positivo cian,
negativo rojo). Si no hay timeline, el gráfico no se muestra y la tarjeta lo dice.

### 2.5 Pantalla Match Review (nuevo orden)

1. Hero (como hoy): resultado, campeón, rol, objetos, KDA / CS/min / Duración / Jugado.
2. **Nota global** con semi-donut pequeño y la frase global.
3. **Selector de área** en píldoras (Farming · Combat · Vision · Lane) y debajo
   la tarjeta del área elegida (semi-donut grande, subfilas, frase, gráfico).
   Se abre en el área con peor nota.
4. "Lane Matchup" (la tabla actual) plegada por defecto bajo "Ver comparación completa".
5. Enlace "¿Cómo se calcula?" que abre una hoja con los objetivos de tu rol, los
   pesos y la N de tu media. Es la misma información de `docs/ANALYSIS.md`.
6. Disclaimer de Riot.

### 2.6 Timeline

- Nueva Edge Function `match-timeline`, copia del patrón de `match-detail`
  (claves, cache, errores `KEY_INVALID`/`RATE_LIMITED`/`NOT_FOUND`/`UNKNOWN`)
  contra `/lol/match/v5/matches/{id}/timeline`. Sin la lógica de "blob reducido".
- Nueva tabla `match_timeline_cache (match_id text pk, region text, data jsonb,
  fetched_at timestamptz)`, RLS sin políticas de cliente (solo service_role),
  igual que `match_details_cache`. La migración vive en el repo de RiftLens
  (`~/Desktop/lol-app-ui/desktop-app/supabase/migrations/`) y se aplica desde
  allí, según la sección 3 del diseño general.
- **Mi decisión:** la función guarda el blob completo en la cache pero responde
  al móvil con una serie reducida por participante y minuto
  (`{ participantId, puuid, minutes: [{ t, cs, gold, xp }] }`, ~10 KB) más la
  lista de `participantId` ↔ `puuid`. El timeline completo pesa 0.5–2 MB y el
  teléfono solo necesita CS, oro y XP por minuto de dos jugadores.
- Se pide una vez al abrir el review (una llamada Riot por partida abierta, para
  siempre). Presupuesto con la clave de desarrollo: abrir 20 reviews seguidos
  cuesta 20 llamadas de 100 por 2 minutos; con detalle + timeline son 2 por
  review nuevo, cabe.
- Rol del oponente: el `participantId` del oponente sale del Match-v5 (misma
  `teamPosition`, otro equipo) y se usa para leer su serie.

### 2.7 Baseline propio

"Tu media" sale de las últimas 20 partidas que la pestaña Matches ya tiene en
la cache de React Query (detalles cacheados, 0 llamadas Riot extra), filtradas
por el mismo rol y excluyendo remakes y la propia partida. Se calcula con las
métricas de Match-v5 (CS/min, KP, muertes/10 min, vision/min). Las métricas de
timeline no entran en la media (no bajamos 20 timelines).

## 3. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Abrir un review y entender en 10 segundos qué área falla y por qué, con un número y su referencia.
- Toda puntuación es reproducible a mano con la tabla de objetivos y pesos.
- Reviews ya abiertos no cuestan llamadas a Riot al reabrirse.

**No-objetivos**
- Comparar contra otros jugadores de tu rango (no tenemos esos datos).
- Objetivos (dragones, heraldo, torres), build, runas, hechizos.
- Consejo táctico ("juega más seguro tras pushear").
- Analizar ARAM, Arena u otras colas sin líneas: el review muestra solo el hero y el Lane Matchup, con "Análisis solo para Grieta del Invocador".

**Anti-objetivos (fallos aunque funcione)**
- Un número sin referencia visible.
- Una nota que cambia porque cambió el baseline sin que el usuario lo sepa.
- Inventar porcentajes de probabilidad de victoria.

## 4. Restricciones

- Sin claves en el repo; la clave Riot solo en el secreto `RIOT_API_KEY` de Supabase.
- Nada nuevo sale del dispositivo salvo la llamada a `match-timeline` (matchId y región).
- Los colores del gráfico son los validados en la Fase 4 (`#0E9DB5` tú, `#E8486F` enemigo); el texto nunca lleva el color de la serie.
- Expo Router 58: nada de pestañas ocultas (`href: null`) para pantallas navegables (gotcha de la Fase 4).
- Casos de test obligatorios del motor: sin timeline, sin oponente, support, 0 kills del equipo, remake, ARAM, partida de 9 minutos (sin fases mid/late), baseline con 0, 1 y 2 partidas.

## 5. Lo que queda al builder

- Forma exacta del semi-donut (SVG con `react-native-svg`, mismo módulo que el trend) y del selector de píldoras.
- Texto de las plantillas de frases (inglés en la UI, como el resto de la app).
- Estructura de `packages/shared/src/analysis/` (puro, sin React): `targets.ts` (tabla), `score.ts` (curvas y pesos), `areas.ts` (cálculo por área), `sentences.ts`, `timeline-series.ts` (lectura de la serie reducida) con tests.
- `docs/ANALYSIS.md` con la tabla, las curvas y un ejemplo numérico calculado a mano.
- Orden de tareas del plan (sugerido): función + tabla → motor en shared → serie de timeline en el móvil → tarjetas y gráfico → pantalla y hoja "cómo se calcula" → aceptación con partidas reales del owner.
