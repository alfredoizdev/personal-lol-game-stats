# LanePulse (LoL Personal Performance v2) — Diseño

**Nombre del producto:** LanePulse, "Personal performance coach" (decidido 2026-10-21, tarde, mockups 09–10).

**Fecha:** 2026-10-21
**Estado:** aprobado por el product owner el 2026-10-21
**Documento padre:** `LOL_PERSONAL_PERFORMANCE_ROADMAP.md` (v1.0). Este diseño lo concreta y lo corrige donde choca con lo que ya existe en RiftLens. Donde los dos difieran, manda este documento.

## 1. Intención y por qué

RiftLens (repo `alfredoizdev/riftlens`, worktree `~/Desktop/lol-app-ui`) funciona, pero se complicó: coaching con coaches humanos, clips, quests, scouting de los 9 rivales, overlay, meta tiers, notificaciones. El usuario ya no sabe qué mirar.

v2 es **el mismo producto recortado a lo personal**: qué hiciste tú en cada partida, cómo lo hiciste contra tu oponente de línea, y qué una sola cosa mejorar. Dos pestañas en el móvil. El desktop es solo un recolector de datos sin interfaz de estadísticas.

No es un producto nuevo ni un rewrite del backend. Reutiliza el proyecto de Supabase, las Edge Functions de Riot, el detector y lector del cliente de League, y el canal en tiempo real que ya conecta desktop y móvil.

## 2. Objetivos, no-objetivos, anti-objetivos

**Objetivos**
- Abrir la app y en una pantalla ver las últimas partidas con campeón, resultado, rol, KDA y CS/min.
- Abrir una partida y leer en menos de 10 segundos: un score, tres números grandes, qué hiciste bien, qué trabajar, una mejora concreta.
- Durante una partida real, ver en el móvil o tablet tus stats y las de tu oponente de línea, actualizadas cada pocos segundos, más el objetivo que fijaste antes de jugar.
- Antes de jugar, elegir campeón y rol y ver tu historial personal contra ese matchup y una sugerencia de ban basada solo en tus partidas.

**No-objetivos (fuera de v2)**
- Coach conversacional, LLM, narrativas de partida.
- Scouting de los otros 9 jugadores, tags de comportamiento, recomendaciones de champ select.
- Overlay sobre el juego, grabación de clips, quests, logros, notificaciones push.
- Coaching con coaches humanos, reservas, pagos, suscripciones.
- Benchmarks contra otros jugadores o contra el rango. Solo baseline propio.
- Soporte a ARAM, Arena y modos rotativos en análisis y pre-partida. Se listan pero sin análisis.

**Anti-objetivos (fallo aunque funcione)**
- Que la pantalla de partida parezca OP.GG o Mobalytics: tabla de 10 jugadores, 40 métricas, badges.
- Consejos tácticos en vivo ("ve a farmear", "haz back"). Solo datos y el objetivo pre-fijado.
- Afirmar cosas que los datos no prueban ("te posicionaste mal") o equiparar perder con jugar mal.
- Cifras inventadas: si un dato no está, se muestra "—", nunca cero.

## 3. Restricciones

- **Riot.** Key de API solo en Supabase Edge Functions. Dev key: 20 req/s, 100 req/2 min, caduca cada 24 h. Production key antes de cualquier beta pública. Disclaimer obligatorio visible en móvil y desktop (texto exacto en memoria de ContextForge, "Riot Developer Portal — Registration path"). Sin RSO hasta aprobación.
- **Política de Riot en vivo.** Mostrar nivel, KDA, CS y visión del oponente de línea es información que el jugador ya ve en el marcador con Tab, por tanto no es "información desconocida para el jugador". Se mantiene detrás de un flag `LIVE_OPPONENT_COMPARE` para poder apagarlo si Riot lo pide. Nunca cooldowns, predicciones ni posiciones.
- **Plataforma.** La detección de League en RiftLens es solo macOS: `process.ts` usa `pgrep` y `lockfile.ts` solo conoce rutas de macOS. Windows no está sin validar, está sin implementar. Ver pregunta abierta en 11.
- **Móvil en segundo plano.** iOS corta el WebSocket al bloquear. La experiencia base es con la pantalla encendida. Al volver al frente, el móvil pide el último snapshot.
- **Supabase compartido.** Mismo proyecto que RiftLens. El historial canónico de migraciones sigue en `lol-app-ui/desktop-app/supabase/migrations`. Cada migración o Edge Function nueva de v2 se escribe en `supabase/` de este repo y se copia al repo de RiftLens en el mismo ciclo, para que `schema_migrations` no se desincronice. Se despliega desde RiftLens.

## 4. Decisiones del product owner

1. Tres pestañas en móvil: `Matches`, `Live` y `Profile` (decidido 2026-10-21, tarde; antes eran dos). Pre-partida vive dentro de `Live` cuando no hay partida. `Profile`: lista de cuentas Riot vinculadas (varios invocadores por usuario, decidido 2026-10-21), añadir otra, elegir la activa, cerrar sesión y borrar cuenta con todos los datos (Edge Function `delete-account` existente, con doble confirmación). La cuenta activa es `profiles.current_puuid` (mismo puntero que lee el desktop de RiftLens); al cambiarla se actualiza también `linked_riot_accounts.last_seen_at`. Todo lo que muestran Matches y Live se refiere a la cuenta activa.
2. Desktop (macOS/Windows) es un recolector: login, estado de conexión, "esperando partida", desconectar. Sin estadísticas ni partidas.
3. Reutilizar Supabase (proyecto, Edge Functions, tablas, Realtime) y el código Electron de detección y lectura del cliente.
4. Pantallas según los mockups entregados el 2026-10-21: lista de partidas, review de partida con score y tres secciones, pre-match con matchups difíciles y ban, live con tú contra oponente y objetivo pre-partida.
5. Estilo (actualizado 2026-10-21, tarde): dirección visual según `docs/mockups/06-look-matches.png`, `07-look-match-review.png` y `08-look-live.png`. Fondo azul marino muy oscuro con degradado, acento violeta (botones, pestaña activa, gráficas), cian para "tú", rojo/rosa para "enemigo" y derrota, verde para victoria y mejoras; tarjetas translúcidas con borde sutil y splash art del campeón como fondo; retratos circulares con anillo de color; chips de una frase por partida ("Strong early game", "Too many deaths"); iconos de objetos; pestañas tipo píldora arriba y barra inferior. Sigue sin ser Mobalytics: pocas métricas grandes, no tablas de 10 jugadores.
6. Referencia en vivo: oponente de línea más objetivo personal. No metas fijas universales.

## 5. Decisiones mías (revisables)

- **Login:** se mantiene el login con email de Supabase de RiftLens. Motivo: partidas, snapshots y el canal Realtime van ligados al `user.id`, y cambiarlo obliga a rehacer RLS y las funciones. Es una pantalla al arrancar y luego no se vuelve a ver.
- **Repo nuevo** en `~/Desktop/lol-app-v-2`, monorepo pnpm con `apps/mobile` (Expo) y `apps/desktop` (Electron), más `packages/shared`. El Electron se copia de RiftLens y se recorta; el móvil se escribe de cero copiando solo módulos puntuales.
- **Desktop sin Next.js.** RiftLens renderiza el desktop con Next 14. En v2 el renderer es una ventana mínima con Vite + React. El publicador de snapshots, que hoy vive en el hook `useLivePublisher` del renderer, se mueve al proceso main.
- **Sesión en desktop:** token de Supabase guardado con `safeStorage` de Electron. No keytar (archivado).
- **Certificado del Live Client:** RiftLens usa `rejectUnauthorized: false` en loopback. Se mantiene para arrancar y queda como pendiente obligatorio antes de distribuir instaladores.
- **Objetivo pre-partida:** por defecto, tu CS/min medio con ese campeón y rol en las últimas 20 partidas si hay al menos 3; si no, tu media del rol; si no, sin objetivo. Editable a mano. Se guarda por usuario y se consume en Live.
- **Cache de partidas obligatoria desde el día uno.** Un detalle de partida se pide a Riot una sola vez y queda en `match_details_cache`. El timeline se pide solo al abrir el detalle.
- **Análisis sin LLM, basado en reglas,** con confianza explícita y tamaño de muestra. Ver 7.
- **Fuente de verdad del historial propio: la Riot API cacheada, no la tabla `matches`.** En RiftLens `matches` la llena el renderer del desktop desde el historial del LCU, y ese código no existe en v2. Todo (lista, baseline del análisis, pre-match, objetivo por defecto) sale de `match-list-ids` + `match-detail` con `riot_match_list_cache` y `match_details_cache`. Para pre-match y baseline se piden hasta 100 ids y los detalles se rellenan en segundo plano con indicador de progreso; cada detalle se pide una sola vez en la vida.
- **Timeline: sí.** Nueva Edge Function `match-timeline` con cache en tabla `match_timeline_cache`, mismo patrón que `match-detail`. Se pide solo al abrir el detalle. Coste: una llamada extra por partida abierta, una vez.
- **Sin interoperabilidad con clientes RiftLens.** El desktop v2 solo habla con el móvil v2. Se conserva el nombre del canal `user:${user.id}` y nada más; el payload es el de 6.3. No se escribe `last_game_snapshots`.
- **LCU mínimo y de solo lectura.** Se mantiene `lockfile.ts` + `lcu-client.ts` recortado para tres lecturas: fase de gameflow (detectar esperando / en partida / terminada), `queueId` de la partida actual (el Live Client solo da `gameMode`) y summoner actual (confirmar que la cuenta del juego coincide con el Riot ID vinculado). Sin champ select, sin lobby, sin LP.
- **Región:** selector al vincular el Riot ID, por defecto NA. `link-riot-account` ya guarda la plataforma (`na1`, `euw1`...) en `linked_riot_accounts.platform`, con política de lectura propia; v2 deriva la región de ahí en cada llamada. Sin columna nueva.
- **Registro:** el móvil v2 tiene inicio de sesión y registro (RiftLens mobile solo tenía inicio de sesión). El desktop solo inicio de sesión.
- **Flag `LIVE_OPPONENT_COMPARE`:** flag de build. Si Riot lo pide, se publica una versión. No flag remoto en v2.
- **Tests de módulos copiados:** `kda-quality`, `death-context`, `kill-context` no tienen tests en RiftLens. Se escriben en v2 al copiarlos.

## 6. Arquitectura

### 6.1 Piezas y de dónde vienen

| Pieza | Origen | Cambio en v2 |
|---|---|---|
| Edge Functions `riot-lookup`, `match-list-ids`, `match-detail`, `link-riot-account`, `delete-account` | RiftLens `desktop-app/supabase/functions` | Se usan tal cual. `delete-account` borra el usuario y todo lo asociado por cascade (Phase 1 lo expone en Profile). |
| Edge Function `match-timeline` | Nueva | Copia el patrón de `match-detail` contra `/lol/match/v5/matches/{id}/timeline`. |
| Tablas `profiles`, `match_details_cache`, `riot_account_cache`, `riot_match_list_cache` | Supabase compartido | Se usan tal cual. `matches`, `match_events`, `last_game_snapshots` no se usan. |
| `electron/league/{process,lockfile,lcu-client,detector,live-client,live-poller}.ts` | RiftLens | Se copian y se recortan: `detector` y `live-poller` pierden sus imports de champ select, lobby y LP; `lcu-client` queda con gameflow, queueId y summoner actual. Se eliminan `champ-select-poller`, `blob-capture`, `recorder`, `rofl-parser`, `replay-list`, `lp-tracker`. |
| Publicador Realtime (`useLivePublisher`) | RiftLens renderer | Se reescribe en main process, misma forma de mensajes. |
| Contexto de partida en vivo (`live-game-context.tsx`) | RiftLens mobile | Se copia y se recorta a `live-snapshot`, `live-ended`, `last-game`. |
| Cálculos `kda-quality`, `death-context`, `kill-context`, `assign-lanes` | RiftLens mobile `src/lib` | Se copian a `packages/shared` los que el análisis necesite, con sus tests. |

`match-detail` no devuelve el timeline (verificado), por eso `match-timeline` es nueva.

### 6.2 Flujo de datos

```
Matches:  móvil → Edge Function match-list-ids / match-detail / match-timeline
          → riot_match_list_cache / match_details_cache / match_timeline_cache → móvil
          (el desktop no ingesta nada; al terminar la partida el móvil sondea
          match-list-ids con backoff hasta que aparece el matchId nuevo)

Live:     League (127.0.0.1:2999) → Electron main (poll 2–5 s)
          → supabase.channel(`user:${userId}`).send('live-snapshot')
          → móvil live-game-context → pantalla Live

Pre-match: móvil → hasta 100 detalles propios cacheados → agrupación local por campeón/rol/oponente
```

### 6.3 Canal Realtime

Se conserva el nombre `user:${user.id}`. Un solo evento, `live-snapshot`, con `isFinal: true` en el último.

> **Fase 7 (2026-10-22):** el canal pasa a ser `lanepulse:${user.id}` y **privado** (`config: { private: true }`, políticas en `realtime.messages`); helper `liveTopic(userId)` en shared. Ver `2026-10-22-phase-7-riot-submission-design.md` §2.3.
>
> **Fase 8 (2026-10-22):** segundo evento `live-phase` en el mismo canal (`{ v: 1, ts, phase, since }`, fase del LCU con latido de 10 s) y campos opcionales en el snapshot (`me.isDead`, `me.respawnSec`, `events[]` normalizados, últimos 20). Ver `2026-10-22-phase-8-live-events-design.md`. El móvil v2 ignora cualquier otro evento que un cliente RiftLens pudiera emitir en la misma cuenta.

Payload de `live-snapshot` (campos nullable, nunca cero inventado):

```ts
type LiveSnapshotV2 = {
  v: 2
  ts: number                 // epoch ms
  isFinal: boolean
  queueId: number | null     // del LCU; null si no disponible
  gameTimeSeconds: number | null
  gameMode: string | null
  me: LivePlayer
  opponent: LivePlayer | null   // enemigo con misma `position`; null si ambiguo
  focus: { metric: 'csPerMin'; target: number } | null
}
type LivePlayer = {
  championName: string
  position: 'TOP'|'JUNGLE'|'MIDDLE'|'BOTTOM'|'UTILITY'|null
  level: number | null
  kills: number | null; deaths: number | null; assists: number | null
  cs: number | null; csPerMin: number | null
  wardScore: number | null
}
```

Campos añadidos en la Fase 4 (visibles en el marcador del juego, sin datos de otros jugadores): `teamKills: number` (kills del equipo propio, para KP) y `items: number[]` en cada `LivePlayer` (siete huecos fijos, 0 = vacío, el séptimo es el trinket).


Oponente de línea en vivo: jugador del equipo contrario con la misma `position` del `playerlist`. Si no hay `position` (ARAM, modos) o hay más de un candidato, `opponent = null` y la pantalla muestra solo tus stats. No se intenta adivinar.

### 6.4 Datos nuevos

Dos tablas:
- `pre_match_focus (user_id, champion_id, role, metric, target, updated_at)`, RLS por usuario.
- `match_timeline_cache (match_id, data jsonb, fetched_at)`, service_role only, sin TTL, igual que `match_details_cache`.

## 7. Análisis de partida (reglas)

Entradas: detalle Match-v5 del jugador, su `teamPosition`, timeline si está (frames por minuto de CS, oro, XP), y baseline propio: últimas N partidas con mismo campeón, rol y cola (N ≤ 20, se muestra el N real).

Métricas: KDA, CS/min (minions + monstruos), KP% con `null` si el equipo tiene 0 kills, muertes, CS a 10 y 15 min si hay timeline, diferencia de CS contra el oponente de línea a 10/15 min cuando `teamPosition` coincide, visión.

Salida: `MatchReview` del roadmap (strengths, improvements, trainingFocus) con `confidence` y `sampleSize`. Reglas de ejemplo, el builder las completa:
- Fortaleza: KP ≥ baseline + 10 puntos, o CS/min ≥ baseline + 0.8.
- A trabajar: CS/min cae más de 25% entre el tramo 0–15 y 15–fin (requiere timeline; sin timeline no se afirma).
- Mejora: la única deficiencia con mayor confianza. Formulada como práctica para la próxima partida, nunca como orden táctica.

Score 0–100: compuesto explicable de CS/min, KP, muertes y visión contra el baseline propio, con pesos fijos y documentados. Si el baseline tiene menos de 3 partidas, el score se marca "provisional". El builder define la fórmula y la documenta en `docs/ANALYSIS.md`.

Casos de test obligatorios: sin historial, 1 partida, 0 kills del equipo, remake (< 5 min o rendición temprana), ARAM, timeline ausente, `teamPosition` vacío.

## 8. Pantallas

**Móvil (Expo, phone y tablet)**
0. `Profile`: icono de invocador (Data Dragon `profileicon/{id}.png`, `linked_riot_accounts.profile_icon_id`), Riot ID, región, cerrar sesión, borrar cuenta (confirmación en dos pasos).
1. Inicio de sesión (email, contraseña con mostrar/ocultar, "Remember me", "Forgot password?" que envía el correo de restablecimiento de Supabase) y registro (username, Riot ID opcional, email, contraseña ≥ 8 y confirmación, región, aceptación de términos). Username y Riot ID se guardan como metadatos del usuario al registrarse y se aplican en el primer arranque con sesión (`profiles.display_name`, `link-riot-account`), porque con confirmación por email no hay sesión al registrarse. Luego Riot ID y región vinculados vía `link-riot-account` si el perfil no lo tiene.
2. `Matches`: últimas 20, pull to refresh. Estados: cargando, vacío, sin Riot ID, rate limited, offline.
3. Detalle: score, KDA / CS/min / KP, tres secciones, y si hay timeline una curva de CS por minuto tuya y del oponente.
4. `Live` sin desktop emparejado: instrucciones (iniciar sesión en el desktop con la misma cuenta).
5. `Live` esperando: pre-match. Selector de campeón y rol, win rate propio, matchups difíciles (mín. 3 partidas; menos se etiqueta "pocas partidas"), sugerencia de ban en texto, objetivo editable.
6. `Live` en partida: tú y oponente, timer, tabla de 5 filas, diferencia de CS, objetivo. Indicador de dato viejo si pasan más de 15 s sin snapshot. Tablet: dos columnas.
7. `Live` terminada: "Partida terminada, analizando" y enlace al detalle cuando `match-list-ids` devuelva el matchId nuevo (sondeo con backoff, hasta 5 minutos).

**Desktop (Electron)**
1. Login con la misma cuenta.
2. Estado: League detectado / esperando partida / en partida / desconectado.
3. Botón desconectar y cerrar sesión. Tray con el mismo estado. Disclaimer de Riot.

## 9. Fases

| Fase | Entrega | Criterio de aceptación |
|---|---|---|
| 1 | Monorepo, Expo con login y tabs, Electron recolector copiado y arrancando, `packages/shared` con tipos | Login funciona en ambos; desktop detecta League en Mac; sin keys en bundles |
| 2 | `Matches` lista y detalle con datos reales vía funciones existentes | Abrir una partida real muestra stats correctas; cache evita segunda llamada |
| 3 | Análisis de partida (sección 7) | Review con evidencia sobre fixtures y sobre partidas reales; tests de casos límite |
| 4 | Live: publicador en main, canal, pantalla Live | En partida real el móvil se actualiza sin refrescar; estados correctos |
| 5 | Pre-match y objetivo, consumido en Live | Elegir campeón muestra historial honesto; objetivo aparece en vivo |
| 6 | Fin de partida → detalle, QA Mac/iOS/Android, disclaimer, borrado de datos, instalador macOS | Flujo completo de abrir League a leer el análisis de esa partida |

Windows queda fuera de las seis fases (ver 11).

No se pasa de fase sin instrucción del product owner.

## 10. Mockups

En `docs/mockups/`:
- `06-look-matches.png`, `07-look-match-review.png`, `08-look-live.png` (2026-10-21, tarde): **la dirección visual vigente** y la estructura de las tres pantallas principales.
- `01-pre-match-preparation.png`, `04-matches-and-review.png`, `05-live-matchup.png`: estructura de información original; siguen valiendo para el contenido de pre-match.
- `09-look-sign-in.png`, `10-look-register.png` (2026-10-21, tarde): login y registro, nombre LanePulse.
- `02-phone-style-reference.png`: referencia anterior, superada por 06–08. `03-mobalytics-what-not-to-do.png`: contraejemplo.

Elementos de 09–10 que **no** se construyen todavía, y por qué:
- "Continue with Apple / Google": requiere configurar los proveedores OAuth en Supabase, una cuenta de Apple Developer y un development build de Expo (Expo Go no soporta Sign in with Apple nativo). Se decide en Fase 6.
- "Email or Riot ID" para iniciar sesión: Supabase autentica por email; un Riot ID no identifica una cuenta de LanePulse de forma segura. El campo es solo email.
- Enlaces a Términos de servicio y Política de privacidad: no existen las páginas aún; el checkbox es obligatorio y el texto no enlaza. Páginas en Fase 6.
- El logotipo: `docs/mockups/logo.png` (entregado 2026-10-21); iconos de iOS/Android/splash generados desde él con fondo `#0B0A1F`.
- Fondo con splash art de Riot: no se usa arte de Riot como fondo (IP). Se usa degradado propio; si se quiere arte de fondo, debe ser propio o con licencia.

Elementos de 06–08 que **no** se construyen tal cual, y por qué:
- Live "Focus right now" con consejo táctico generado del estado de la partida ("play safer after pushing side waves"): es consejo táctico en vivo, prohibido por la sección 3 y por la política de Riot. En su lugar: el objetivo fijado antes de jugar y, como mucho, un estado neutro ("CS/min por encima de tu objetivo").
- Live: oro, daño y rango del enemigo. El Live Client no expone oro ni daño de otros jugadores; el rango requiere una llamada a Riot por rival en vivo. Se muestran nivel, KDA, CS, CS/min y visión, que el marcador del juego ya enseña.
- Live "Objective Presence" (dragones, heraldo, torres): fuera de v2 (no es rendimiento personal).
- Match Review: "won 4 of your first 5 trades", "lost ~420 gold from 6 uncollected side waves", "damage to champs at 10" no se pueden derivar con fiabilidad del timeline de Match-v5. Se sustituyen por métricas demostrables (sección 7): CS a 10/15, diferencia de CS vs oponente, KP, muertes, visión, caída de CS/min por tramo.
- Rango del oponente en Match Review: solo si sale de datos propios del partido o de una llamada cacheada; nunca se infiere.

## 11. Decisiones cerradas con el product owner (2026-10-21)

1. **Windows.** v2 se construye primero para macOS. Windows entra después de la fase 6 como trabajo aparte: implementación de `process.ts` y `lockfile.ts` para Windows y validación en una máquina real. Hasta entonces el desktop solo se distribuye para macOS.
2. El product owner aprobó el documento y las decisiones de la sección 5 el 2026-10-21.
3. **Profile:** sí, tercera pestaña como en los mockups 06–08, con varias cuentas Riot por usuario (decidido 2026-10-21, tarde).
4. **Pendiente (técnico):** quitar una cuenta vinculada necesita una política `delete` propia en `linked_riot_accounts` (hoy solo hay select/insert/update). Es una migración nueva que se copia al repo de RiftLens según la sección 3. Hasta entonces Profile no ofrece "quitar cuenta".

## 11b. Decisiones añadidas el 2026-10-22

5. **Objetivo: aprobación de Riot.** El owner va a someter LanePulse al portal de desarrolladores de Riot para producción. Toda función se diseña para pasar esa revisión: nada de consejo táctico en vivo, ni en pantalla ni en notificaciones; solo datos propios y estado neutro.
6. **Notificaciones de objetivo en partida (petición del owner):** se harán en la Fase 6, enviadas por el desktop a través del servicio push de Expo (el móvil registra su token en Supabase), cada 5 minutos o solo al cambiar de estado (opción), con texto de estado ("15:00 · Goal 7.0 CS/min · Below goal, now 5.2"), nunca una instrucción. Requieren build de desarrollo con EAS. **Hecho en la Fase 7** (`2026-10-22-phase-7-riot-submission-design.md`): canal privado `lanepulse:<uid>`, `goal-notifier` compartido, envío desde el desktop, textos legales, sitio público y documento de solicitud en `docs/riot/`.

## 12. Lo que queda al builder

- Estructura interna de componentes, navegación con Expo Router, estado con TanStack Query.
- Fórmula del score y pesos (documentados).
- Forma exacta del selector de campeón y de la curva de CS.
- Tooling: ESLint, Vitest, CI.
- Cómo empaquetar el Electron (electron-builder) y EAS para el móvil.
