# Fase 8 — Live: fase del cliente, eventos en directo y avisos en la app (diseño)

Fecha: 2026-10-22. Petición del owner tras aceptar los avisos push de la Fase 7
en su iPhone: "en vez de push, modales para que se vea bien; si te matan, tu
avatar en gris con los segundos que faltan para nacer; eventos tipo RiftLens;
y cuando estés buscando partida que salga que estás buscando partida". También:
"al acabar la partida, Live se queda estancado; debería volver a Prepare". El
owner pidió diseñar según la recomendación del builder ("haslo según tu
recomendación"). Todas las decisiones de abajo son del builder y revisables.

## 1. Intención

Que la pestaña Live acompañe la sesión entera, no solo los minutos de juego:
qué está haciendo el cliente (lobby, cola con su cronómetro, partida
encontrada, selección, cargando), lo que pasa en la partida tal y como el
propio juego lo muestra (muertes con su cuenta atrás, kills, objetivos) y los
cambios de estado del objetivo, todo **dentro de la app** con tarjetas que
entran por arriba cuando Live está abierto. El push de la Fase 7 queda para
cuando la app está cerrada o en segundo plano.

Regla de Riot intacta: solo datos del propio jugador y de lo que su cliente ya
le enseña (kill feed, marcador, temporizadores de muerte); texto de estado,
nunca una instrucción.

## 2. Qué se construye

### 2.1 Fase del cliente en el móvil

El desktop ya lee la fase del LCU cada 2 s (`live-poller.ts`); hoy el móvil
solo recibe snapshots de partida. Nuevo mensaje en el **mismo canal privado**
`lanepulse:<uid>`, evento `live-phase`, payload
`{ v: 1, ts, phase, since }` (`since` = ms desde que empezó esa fase, para el
cronómetro de cola). Se publica al cambiar de fase y como latido cada 10 s.
El móvil muestra, en lugar de "Waiting for a match":

| Fase LCU | Texto en Live |
|---|---|
| `None` / sin desktop | "Waiting for a match" + nota del collector (como hoy) |
| `Lobby` | "In lobby" |
| `Matchmaking` | "Searching for a match · 1:23" (cronómetro local a partir de `since`) |
| `ReadyCheck` | "Match found" |
| `ChampSelect` | "Champion select" |
| `GameStart` | "Loading into the game…" |
| `EndOfGame` / `WaitingForStats` | se trata como fin: ver 2.4 |

La tarjeta Prepare sigue debajo en todas las fases previas a la partida.

### 2.2 Snapshot ampliado (compatible)

`LiveSnapshotV2` conserva `v: 2`; se añaden campos **opcionales** que el
parser rellena por defecto si faltan (un desktop viejo sigue funcionando):

- `me.isDead: boolean | null`, `me.respawnSec: number | null` (y lo mismo en
  `opponent`): de `allPlayers[].isDead` / `respawnTimer` del Live Client.
- `events: LiveEvent[]`: los **últimos 20** eventos de `allgamedata.events.Events`
  normalizados: `{ id, time, type, actor, victim, assisters, meta }` con
  `type` ∈ `GameStart | MinionsSpawning | FirstBlood | ChampionKill | Multikill
  | Ace | DragonKill | HeraldKill | BaronKill | TurretKilled | InhibKilled |
  GameEnd`; `actor`/`victim` son **nombres de campeón** (el Live Client da
  summoner names; se mapean con `allPlayers`) más `actorIsMe` / `victimIsMe`.
  Lo que no se reconoce se descarta. `meta` lleva `killStreak`,
  `dragonType`, `stolen`, `acingTeam`, `result` (GameEnd) cuando aplique.

El desktop no hace ninguna llamada nueva: `events` viene en el mismo
`allgamedata` que ya se lee.

### 2.3 Lo que se ve en Live durante la partida

- **Muerte:** en el héroe, el retrato del jugador muerto (tú o el rival de
  línea) se atenúa (gris) con un número grande encima: la cuenta atrás de
  reaparición (`ceil(respawnSec)`), que el móvil decrementa cada segundo
  entre snapshots. Al reaparecer vuelve el retrato normal.
- **Avisos en la app** (`AlertStack`): tarjetas que entran por arriba de la
  pantalla, máximo 3 visibles, se van solas a los 5 s o al tocarlas. Fuentes:
  - cambio de estado del objetivo (mismo texto que el push: "Goal 7.0 CS/min ·
    Below goal, now 5.2");
  - eventos nuevos que te implican o son de equipo: "You killed Yone",
    "Killed by Yone · back in 24 s", "Assist on Zed", "Double kill!",
    "First blood", "Your team took Dragon (Infernal)" / "Enemy team took
    Baron", "Turret down" / "Your turret fell", "Ace";
  - "Match found" al llegar `ReadyCheck`.
  Nunca una frase de consejo (test de palabras prohibidas como en el notifier).
- **Feed de eventos:** tarjeta "Game events" bajo las tiles con la lista de los
  últimos eventos (hora de partida, icono, línea), más reciente arriba.
- **Push en primer plano:** si la app está activa, el handler de
  `expo-notifications` no muestra banner (la tarjeta ya lo cuenta); en segundo
  plano el push sigue igual que en la Fase 7.

### 2.4 Fin de partida → de vuelta a Prepare

Al recibir `isFinal` el héroe muestra ENDED como hoy, y la pantalla **vuelve a
la vista previa a la partida** (fase + Prepare) en cuanto llega un `live-phase`
distinto de juego (lobby / fin) **o a los 60 s**, lo que ocurra antes. Queda
arriba una tarjeta compacta "Last match · Yasuo · 24:10 · Goal met · Your
review appears in Matches in a minute" con botón "Go to Matches", que
desaparece al empezar la siguiente cola o al tocar su cierre.

### 2.5 Demo

El feed de demo (`LPP_LIVE_DEMO=1`, solo con League cerrado) añade una muerte
propia a los 30 s (`isDead`, `respawnTimer` descendente 20 s), un kill y un
dragón, y recorre las fases `Matchmaking → ReadyCheck → ChampSelect →
InProgress → EndOfGame → Lobby`, para verificar todo en el simulador sin
partida real.

## 3. Objetivos, no-objetivos, anti-objetivos

**Objetivos:** Live útil desde que abres el cliente hasta que vuelves al lobby;
avisos visibles dentro de la app; muerte y eventos como en el juego; vuelta
automática a Prepare.

**No-objetivos:** haptics o sonidos (módulo nativo nuevo → build nuevo; luego);
eventos de otros jugadores que no te impliquen ni sean de equipo; overlay en el
Mac; cambios en el push de la Fase 7 salvo el silencio en primer plano.

**Anti-objetivos:** cualquier aviso que suene a orden ("vuelve a línea",
"haz el dragón"); mostrar algo del rival que el marcador del juego no muestre;
un snapshot v3 que rompa el desktop o el móvil viejos.

## 4. Restricciones

Las de siempre (sin secretos; UI en inglés; `pnpm -r typecheck/lint/test`
verdes por tarea; sin consejo táctico). Sin dependencias nativas nuevas: el
build de desarrollo instalado hoy debe seguir sirviendo. Motores puros y
testeados en shared: normalización de eventos, texto de cada evento, avisos
nuevos entre dos snapshots, etiqueta de fase, cuenta atrás de reaparición.

## 5. Lo que queda al builder

Estilo de las tarjetas (tokens actuales), iconos del feed, orden exacto de las
secciones de Live, nombres de tipos y funciones.
