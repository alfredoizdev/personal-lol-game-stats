# Fase 6 — Página Performance (diseño)

Fecha: 2026-10-22. El owner pidió "una page performance donde podemos
enfocarnos más en el performance del cliente: contra quién más pierde, qué línea
es más fuerte, etc." y aprobó arrancar sin preguntas ("ok haslo"). Todas las
decisiones de abajo son del builder salvo donde se indica, y son revisables.

El paquete para la solicitud a Riot (notificaciones de estado, términos y
privacidad, build EAS, texto de la solicitud) pasa a la **Fase 7**; esta página
es parte de lo que se enseña en esa solicitud: análisis solo de las partidas
propias del jugador, sin consejos tácticos.

## 1. Intención

Una pestaña que responde en una pantalla, con las partidas ya guardadas, las
preguntas que el jugador se hace después de una mala racha: ¿cómo voy?, ¿en qué
rol soy más fuerte y en cuál más débil?, ¿qué área me frena (farm, combate,
visión)?, ¿con qué campeones gano?, ¿contra quién pierdo en línea?

Todo sale de `MatchSummary` (las últimas 100 partidas del backfill de la
Fase 5, cacheadas en Supabase y en el móvil). **Ninguna llamada nueva a Riot**,
ningún dato de otros jugadores, ninguna lista de tiers.

## 2. Qué se construye

### 2.1 Dónde vive

Cuarta pestaña **Performance** (orden: Matches, Live, Performance, Profile),
icono de gráfico. Una sola pantalla con scroll; sin rutas anidadas en esta
fase. Cabecera: título, Riot ID de la cuenta activa, la barra de backfill
("n of 100 games loaded" + botón) de la Fase 5 reutilizada tal cual: el
jugador decide cuándo cargar; nada automático.

### 2.2 Periodo

Decisiones del owner (2026-10-22): primero "las últimas 20 partidas" y sin
selector; después, al ver que la pestaña carga sola las 100 para los matchups,
**una sola regla: todas las tarjetas sobre las últimas 100 partidas**
analizables, esperando la carga completa tras una sola barra de progreso. La
forma reciente se conserva como comparable ("last 20 · −0.3") y en las barras
de las últimas 10. El subtítulo dice "last 100 games" o "your 57 loaded games".

### 2.3 Tarjeta Overview

- Semi-donut con la **media de la puntuación de partida** (la misma
  puntuación 0–100 de las filas de Matches: `analyzeMatch` sin timeline ni
  baseline) y el escalón "7+ · Reliable" de la escalera de RiftLens.
- Récord "12W – 8L · 60 % win rate" y, si hay, la racha actual ("3-game loss
  streak", mínimo 2).
- **Last 10 games**: diez barras (de la más antigua a la más reciente), altura
  = puntuación, color = victoria/derrota, una sola leyenda.
- Owner (2026-10-22): la tarjeta se veía "muy regada"; se quitó la frase
  descriptiva (repetía lo de las tarjetas de abajo) y la nota de periodo. El
  motor sigue generando `headline` (testeado) por si se usa en otra vista.

### 2.4 Tarjeta Roles ("Where you are strongest")

Una fila por rol jugado: icono de rol, nombre, "n games · 55 % win", barra de
media de puntuación con el color del rating y el número. Orden por partidas.
**Strongest / Weakest** solo entre roles con ≥ 3 partidas (media de puntuación;
desempate win rate, luego partidas); con un único rol elegible solo hay
strongest. Menos de 3 partidas: etiqueta "few games" y fuera del ranking.

### 2.5 Tarjeta Areas ("What holds you back")

Media por área de las puntuaciones de `analyzeMatch` sobre el periodo:
**Farming, Combat, Vision**. **Lane no entra**: necesita el timeline de cada
partida y la página no lo descarga (nota en la tarjeta: "Lane is scored in each
Match Review"). Por área: barra + número + rating, y debajo las sub-filas
puntuadas con su media y su objetivo medio: "CS / min 6.4 · target 7.0",
"Kill participation 48 % · target 55 %", "Deaths per 10 min 1.9 · target 1.5",
"Vision score / min 0.52 · target 0.6", "Wards placed / min 0.21 · target
0.25". El objetivo es la media de los objetivos por rol de las partidas del
periodo (si mezclas roles, es un objetivo "típico"; se dice en la nota).
Weakest area: la de menor media con ≥ 3 partidas; para supports Farming no se
puntúa y no aparece.

### 2.6 Tarjeta Champions ("Your champions")

Hasta 8 campeones por partidas jugadas: retrato (anillo verde ≥ 50 %, rojo
< 50 %), nombre de Data Dragon, icono del rol más jugado con ese campeón,
"n games", win rate coloreado, escalón medio ("7+"). "few games" bajo 3.

### 2.7 Tarjeta Lane matchups ("Who beats you")

Agrupado por (campeón enemigo de línea, rol) sobre todos los roles y sobre
**todas las partidas cargadas** (no solo las 20 del periodo: un rival repetido
es raro en 20 partidas; ajuste del builder tras la primera captura), con ≥ 2
partidas, igual que la Fase 5 pero sin filtrar por rol:

- **You lose to**: 5 peores con win rate < 50 % (ascendente; desempate: más
  partidas, nombre).
- **You beat**: 3 mejores con win rate > 50 %. Un 50 % no sale en ninguna
  (ajuste tras la primera captura: el mismo oponente salía en las dos listas).

Fila: retrato, nombre, icono de rol, "W – L", win rate y barra. Sin
sugerencia de ban aquí (ya está en Prepare); sin consejos.

### 2.8 Estados

- Sin partidas cargadas: la barra de backfill con su botón y una tarjeta
  "Load your games to see your performance". Las 20 de Matches ya cuentan.
- Pocas partidas (< 3): frase "Only n games loaded — load more for a clearer
  picture"; las tarjetas se muestran con sus etiquetas "few games".
- Mientras carga: las tarjetas se recalculan por chunk (como Prepare).

## 3. Objetivos, no-objetivos, anti-objetivos

**Objetivos:** responder las cinco preguntas de la sección 1 en una pantalla;
cada número con su "por qué" (objetivo, partidas, periodo); cero llamadas
nuevas a Riot; motor puro y testeado.

**No-objetivos:** comparación con otros jugadores o con el elo; tendencia por
fecha (gráfica temporal); detalle por campeón navegable; filtros por cola;
Lane en los agregados; persistir el periodo.

**Anti-objetivos:** un "strongest" con 1–2 partidas; una frase que suene a
orden ("juega Mid"); un objetivo inventado sin decir de dónde sale; mezclar
cuentas Riot (todo es por la cuenta activa, como el backfill).

## 4. Restricciones

Las de siempre: sin secretos; Riot solo vía Edge Functions ya existentes (aquí
ninguna nueva); UI en inglés; sin `href: null` navegable; sin consejos tácticos
(política de Riot, diseño general 10/11b); `pnpm -r typecheck/lint/test`
verdes por tarea; un commit por tarea.

Motor puro en `packages/shared/src/performance/`: casos obligatorios: 0
partidas; 1–2 partidas; ARAM y remakes fuera; rol nulo; oponente ausente o con
rol distinto; un solo rol (sin weakest); support (sin Farming); empates de
win rate; racha de 1 (null); periodo mayor que las partidas cargadas.

## 5. Lo que queda al builder

Nombres exactos de tipos y funciones, estilos (mismos tokens, tarjetas y barras
de las fases 3–5), orden de los iconos de la tab bar, y la sección nueva de
`docs/ANALYSIS.md` que documenta los agregados.
