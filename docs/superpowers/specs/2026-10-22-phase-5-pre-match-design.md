# Fase 5 — Pre-partida y objetivo personal (diseño)

Fecha: 2026-10-22. Desarrolla la sección 8.5 del diseño general
(`2026-10-21-lol-personal-performance-v2-design.md`), la regla del objetivo por
defecto (sección 5) y la tabla `pre_match_focus` (6.4). El owner aprobó las dos
recomendaciones de abajo el 2026-10-22 ("sobre la fase 5 ya está").

## 1. Intención

Antes de jugar, el jugador elige campeón y rol en el móvil y ve **su propio
historial** con ese campeón: cuántas partidas, cómo le fue, contra qué
oponentes perdió más, y fija **un objetivo medible** para la próxima partida.
Ese objetivo aparece en la pestaña Live durante la partida y se evalúa en el
Match Review al terminar. Todo sale de sus partidas cacheadas; nunca de otros
jugadores ni de datos ocultos del cliente.

## 2. Qué se construye

### 2.1 Dónde vive

En la pestaña **Live**, cuando no hay partida (`state === 'waiting'` sin
snapshot): debajo de la tarjeta "Waiting for a match" aparece el bloque
**Prepare your next game**. Cuando hay partida, Live muestra el objetivo
aplicado (2.5). Manual primero: el móvil no detecta la selección de campeón
(roadmap). Decisión del owner: nada de avisos desde el desktop en esta fase.

### 2.2 Selector de campeón y rol

- **Rol:** cinco chips (Top, Jungle, Mid, Bot, Support) con los iconos de rol.
  Por defecto el rol de tu última partida analizable.
- **Campeón:** buscador sobre la lista completa de Data Dragon
  (`cdn/{version}/data/en_US/champion.json`, cacheada un día), con **tus
  campeones primero** (ordenados por partidas jugadas en ese rol, con el conteo)
  y el resto alfabético. Icono de campeón de DDragon.
- Lo último elegido se recuerda en el dispositivo (AsyncStorage / `expo-sqlite`
  no; `@react-native-async-storage/async-storage` ya es dependencia de Expo Go).

### 2.3 Historial propio con ese campeón y rol

Fuente: `match-list-ids` con `count` 100 + `match-detail` por id, cacheados
para siempre (diseño general, sección 5). Los detalles que falten se bajan en
segundo plano con un indicador "42 of 100 games loaded"; mientras tanto los
números se calculan con lo que hay y se marcan "loading…". Presupuesto Riot:
la primera vez hasta 100 detalles (limitador de 4 en vuelo y reintentos ante
429); después, 0.

Solo partidas analizables (colas 400/420/430/440/480/490/700), sin remakes.

Se muestra:
- **Resumen:** partidas con ese campeón y rol, victorias, win rate, KDA media,
  CS/min media. Con menos de 3 partidas: "Few games with X" y se muestran igual.
- **Toughest matchups:** los oponentes de línea (misma `teamPosition`) contra
  los que más has perdido: tabla de hasta 5 filas con campeón enemigo, partidas,
  victorias y win rate, ordenada por peor win rate y luego por más partidas.
  Mínimo 2 partidas contra ese campeón para listarse; con menos de 3 se
  etiqueta "few games". Si no hay oponente con tu rol en una partida, esa
  partida no cuenta aquí.
- **Ban to consider:** una frase, no una orden: "You lost 4 of 5 games against
  Draven as Bot. Consider banning it." Solo si hay al menos 3 partidas contra
  ese campeón y win rate < 40 %. Si no se cumple: "Not enough games against a
  single champion to suggest a ban."

Anti-objetivo: nunca sugerir bans por meta global ni por otros jugadores.

### 2.4 Objetivo personal

- **Métricas elegibles (decisión del owner, 2026-10-22):** CS/min, vision
  score/min, muertes por 10 min, participación en kills (%). Las cuatro ya se
  calculan en Live y en el review (`metricsOf`). Para `UTILITY` la métrica por
  defecto es vision score/min; para el resto CS/min.
- **Valor por defecto** (diseño general, sección 5): tu media con ese campeón y
  rol en las últimas 20 partidas analizables si hay al menos 3; si no, tu media
  del rol; si no, el objetivo del rol de `ROLE_TARGETS` (docs/ANALYSIS.md). Se
  indica de dónde salió ("your average with Jinx, 7 games").
- Editable con un stepper (CS/min ±0.1, vision ±0.05, muertes ±0.1, KP ±1) y
  botón "Save goal". Se guarda en Supabase:
  `pre_match_focus (user_id, champion_id, role, metric, target, updated_at)`,
  clave primaria `(user_id, champion_id, role)`, RLS por usuario (select /
  insert / update / delete own). Migración en este repo, copiada a RiftLens y
  desplegada como la del timeline (el builder despliega mostrando los comandos).
- También se guarda el **último objetivo fijado** (cualquier campeón) para el
  fallback de 2.5: fila con `champion_id = 0` y el rol real.

### 2.5 En vivo (automático por campeón, decisión del owner)

El móvil lee los objetivos del usuario (query cacheada) y, cuando llega un
snapshot, elige el objetivo para `(championId del snapshot, position)`; si no
existe, el último fijado (`champion_id = 0`, mismo rol); si tampoco, ninguno.
`LiveSnapshotV2.focus` del desktop sigue siendo `null` y no se usa (sin cambios
en el desktop ni en el payload).

El snapshot trae `championName`, no `championId`: la correspondencia sale del
`champion.json` de DDragon (`key` → id). Si el nombre no se resuelve, se usa el
fallback por rol.

El hero del Live muestra "Personal goal: 7.0 CS/min" y un estado neutro, nunca
un consejo: "On track" (valor actual ≥ objetivo), "Below goal" o "—" si la
métrica es null (KP con 0 kills del equipo, primeros 60 s). Para muertes por 10
min "On track" es ≤ objetivo.

### 2.6 Evaluación en el review

En Match Review, si existe un objetivo para `(championId, role)` guardado antes
de `gameCreation` (se compara `updated_at`), la tarjeta del área
correspondiente (Farming para CS/min, Vision, Combat para muertes/KP) muestra
una fila "Your goal: 7.0 CS/min → you did 6.2 (missed)" / "(met)". Sin objetivo
previo, nada. No cambia ninguna puntuación.

### 2.7 Perfil

Nada nuevo en Profile en esta fase.

## 3. Objetivos, no-objetivos, anti-objetivos

**Objetivos:** elegir campeón y ver un resumen honesto en menos de 10 s; fijar
un objetivo en dos toques; verlo en vivo sin hacer nada; saber al terminar si
se cumplió.

**No-objetivos:** detección de champ select desde el desktop; estadísticas de
otros jugadores; meta/tier lists; objetivos múltiples por partida; runas, build
o hechizos.

**Anti-objetivos:** un ban sugerido con menos de 3 partidas; un objetivo por
defecto sin decir de dónde sale; un "On track / Below goal" que suene a consejo
táctico; una suposición de campeón cuando el nombre no se resuelve.

## 4. Restricciones

- Mismas de siempre: sin secretos en el repo; Riot solo vía Edge Functions
  cacheadas; sin `href: null` navegable; UI en inglés; `pnpm -r typecheck/lint/test`
  verdes por tarea.
- Riot budget de la primera carga del historial: ≤ 100 `match-detail` (una sola
  vez en la vida), con progreso visible; nunca re-pedir lo cacheado.
- Motor puro y testeado en `packages/shared/src/prematch/` (sin React):
  agrupación por campeón/rol/oponente, win rates, ban suggestion, objetivo por
  defecto, estado "On track". Casos obligatorios: 0 partidas; 1–2 partidas;
  oponente ausente; remake y ARAM excluidos; empate de win rate; KP con 0 kills;
  objetivo de muertes (menos es mejor); nombre de campeón no resuelto.

## 5. Decisiones tras el chequeo del builder (2026-10-22)

Un revisor independiente dejó cuatro preguntas. Las cierro yo (el owner puede
cambiarlas); ninguna requiere nueva información suya.

1. **Objetivos por cuenta Riot, no por usuario.** La tabla lleva `puuid`:
   `pre_match_focus (id uuid pk default gen_random_uuid(), user_id uuid references
   auth.users on delete cascade, puuid text, champion_id int, role text, metric
   text, target numeric, set_at timestamptz default now())`, índice
   `(user_id, puuid, champion_id, role, set_at desc)`, RLS select/insert/delete
   own. **Append-only:** cada "Save goal" inserta una fila; el objetivo vigente
   es la última fila por `(puuid, champion_id, role)`. Así el review puede
   recuperar el objetivo que estaba en vigor cuando se jugó (última fila con
   `set_at` anterior al **final** de la partida, `gameCreation + gameDuration`)
   aunque después se haya cambiado. El fallback "último objetivo" es la última
   fila de esa `puuid` y rol con cualquier `champion_id`; se usa igual en Live y
   en el review.
2. **Matchups y ban por rol, no por campeón.** "Toughest matchups" y la frase de
   ban agrupan por `(puuid, rol)` dentro de las 100 partidas: contra qué campeón
   enemigo de tu misma posición has perdido más, juegues el campeón que juegues
   ("You lost 4 of 5 games against Draven as Bot"). El resumen de arriba (partidas,
   win rate, KDA, CS/min y el objetivo por defecto) sí es por campeón y rol.
3. **Clave Riot y carga del historial.** La clave desplegada es de desarrollo
   (100 peticiones / 2 min). La carga de hasta 100 detalles **no arranca sola**:
   el bloque pre-partida muestra "Load your last 100 games" con lo que ya haya en
   cache; al pulsar, se bajan por bloques de 20 respetando el limitador, con
   progreso "42 of 100", pausando mientras un review esté abierto. Las partidas
   ya cacheadas (las 20 de Matches) se usan al instante. El objetivo "resumen
   en 10 s" aplica a partir de la segunda vez.
4. Lo demás que el revisor marcó como decidible: `expo install
   @react-native-async-storage/async-storage`; un support que elige CS/min sin
   historial no recibe valor por defecto (campo vacío); el nombre del campeón del
   Live Client se resuelve contra `champion.json[*].name` con la tabla `SPECIAL`
   de `ddragon.ts`; la ventana del valor por defecto son las 20 partidas
   analizables más recientes con ese campeón y rol dentro de las 100.

## 6. Lo que queda al builder

- Forma exacta del buscador de campeones y del stepper.
- Textos de los estados vacíos.
- Estructura de hooks (`useOwnHistory(100)`, `useChampionList`, `useFocus`).
- Orden de tareas: migración + motor → historial/hook → pantalla pre-match →
  objetivo guardado y Live → evaluación en review → aceptación.
