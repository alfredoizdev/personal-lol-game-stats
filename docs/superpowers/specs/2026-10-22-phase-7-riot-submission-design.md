# Fase 7 — Paquete para la solicitud a Riot (diseño)

Fecha: 2026-10-22. Desarrolla la sección 11b del diseño general
(`2026-10-21-lol-personal-performance-v2-design.md`): el owner va a registrar
LanePulse en el portal de desarrolladores de Riot como "larger-scale product"
para obtener una **Production API key**. Fuentes: notas de ContextForge "Riot
Developer Portal — Registration path + policy constraints" (2026-06-04) y la
decisión del 2026-10-22 (notificaciones solo de estado). El owner aprobó
arrancar ("haslo") y pidió ver el diseño antes de construir.

## 1. Intención

Que LanePulse pase la revisión de Developer Relations a la primera: producto
completo y visible (sitio público con descripción, términos y privacidad),
datos solo del propio jugador, sin ventaja competitiva ni consejo táctico,
disclaimer visible, uso de la API explicado con cifras, borrado de datos real.
Y entregar la única función nueva que el owner pidió para esta fase: las
**notificaciones de objetivo en partida, solo de estado**.

## 2. Qué se construye

### 2.1 Sitio público y páginas legales

- `apps/site/`: sitio estático (HTML + CSS, sin framework) con tres páginas:
  `index.html` (qué es LanePulse, capturas, disclaimer de Riot, enlaces),
  `terms.html`, `privacy.html`. Desplegable en Vercel con `vercel deploy`
  (el owner tiene cuenta); el builder deja el proyecto listo y el owner elige
  el dominio (sección 6).
- El texto legal vive una sola vez en `packages/shared/src/legal.ts`
  (`TERMS_SECTIONS`, `PRIVACY_SECTIONS`, `LEGAL_VERSION`, `LEGAL_CONTACT`)
  y se renderiza en el sitio (script de build que genera el HTML) y en el
  móvil (`(app)/legal/terms`, `(app)/legal/privacy`, pantallas con scroll).
- En el registro, el checkbox "I agree to the Terms of Service and Privacy
  Policy" enlaza cada nombre a su pantalla (sin perder el formulario); las
  pantallas legales viven **fuera** del grupo autenticado (`/legal/terms`,
  `/legal/privacy`) para que se puedan abrir antes de iniciar sesión. En
  Profile, sección "Legal" con los dos enlaces y la versión aceptada
  (`LEGAL_VERSION`, guardada en los metadatos del usuario al registrarse; sin
  columna nueva en `profiles`).
- Contenido (inglés, lenguaje llano, **borrador para que el owner lo revise
  con quien corresponda**): qué datos se guardan (email, Riot ID y puuid,
  región, partidas descargadas de la API de Riot y cacheadas por partida,
  snapshots en vivo transitorios, objetivos, tokens push), para qué, dónde
  (Supabase, región del proyecto), terceros (Riot Games API, Supabase, Expo
  push), retención, borrado (sección 2.2), que no se venden datos, edad
  mínima, contacto, disclaimer de Riot.

### 2.2 Borrado y retención

- `Delete account and data` ya llama a `delete-account` (Edge Function de
  RiftLens) que borra `auth.users` y cascada. Se verifica y documenta la
  cascada para las tablas de LanePulse: `linked_riot_accounts`,
  `pre_match_focus`, `lanepulse_push_tokens` y `notification_prefs` (nuevas),
  `profiles`.
- `match_details_cache` y `match_timeline_cache` están indexadas por
  partida, no por usuario: son datos públicos de Riot cacheados para
  ahorrar llamadas; se explica así en la privacidad y en la solicitud.
- El texto de confirmación en Profile pasa a enumerar lo que se borra.

### 2.3 Canal Realtime privado

- Hoy el Live usa el canal público `user:<userId>`: cualquiera con el id
  podría escuchar o inyectar snapshots. Además RiftLens (mismo proyecto,
  mismos usuarios) sigue publicando en público en ese mismo nombre, así que
  LanePulse **cambia de canal**: `lanepulse:<userId>`, **privado**, con
  Realtime Authorization: migración `realtime_messages_lanepulse_policies`
  con políticas sobre `realtime.messages` para `broadcast`: recibir y enviar
  solo si `realtime.topic() = 'lanepulse:' || auth.uid()`. Las políticas
  solo afectan a canales privados; los canales públicos de RiftLens siguen
  igual (decisión tras el chequeo del builder, 2026-10-22; sustituye a la
  sección 6.3 del diseño general en el nombre del canal).
- Desktop (`live-publisher.ts`) y móvil (`useLiveSnapshot.ts`) suscriben con
  `config: { private: true }`; ambos ya tienen JWT de usuario. Helper
  compartido `liveTopic(userId)` para que el nombre del canal no se repita.
- Prueba: con dos usuarios, el segundo no recibe ni puede publicar en el
  canal del primero (verificación manual documentada + test del helper).

### 2.4 Notificaciones de objetivo en partida (solo estado)

**Quién envía:** el desktop, que ya tiene el snapshot cada segundo y la sesión
del usuario. No hay servidor nuevo.

**Qué lee el desktop (todo con su JWT, RLS own):**
- `pre_match_focus` → objetivo con `goalFor(goals, puuid, championId, role)`
  (motor de la Fase 5). El `championId` sale de Data Dragon `champion.json`
  (el desktop lo descarga una vez por versión, como el móvil).
- `lanepulse_push_tokens` (nueva, sección 2.6) → tokens activos del usuario
  registrados por **esta** app. No se reutiliza `push_tokens` de RiftLens:
  esa tabla no distingue apps y el móvil de RiftLens registra ahí los mismos
  `user_id`, así que compartirla cruzaría avisos entre las dos apps
  (decisión tras el chequeo del builder, 2026-10-22).
- `notification_prefs` (nueva, sección 2.6) → si el usuario activó los avisos
  y con qué cadencia.

**Cuándo envía** (`goal-notifier.ts`, puro y testeado):
- Nunca antes de 60 s de partida ni con métrica `null` (KP sin kills).
- Modo `change` (por defecto): al primer estado conocido y después solo
  cuando cambia On track ↔ Below goal.
- Modo `interval`: cada 5 min de partida (5:00, 10:00…) y además al cambiar
  de estado. Nunca dos avisos en menos de 60 s.
- Al terminar la partida: un último aviso "Game over · Goal met / missed ·
  7.3 CS/min". Nada más.
- Texto: título "LanePulse", cuerpo "15:00 · Goal 7.0 CS/min · Below goal,
  now 5.2". **Solo estado y números propios; nunca una instrucción.**

**Cómo envía:** POST a `https://exp.host/--/api/v2/push/send` (Expo Push API,
sin token de acceso: el proyecto no activa "enhanced security"). Respuestas
`DeviceNotRegistered` → `revoked_at = now()` en `push_tokens` (RLS update own).
Fallos de red: se ignoran y se reintenta en el siguiente evento; nunca
bloquean el poller. El `puuid` del objetivo se resuelve comparando el Riot ID
del LCU (gameName#tagLine, sin distinguir mayúsculas) con
`linked_riot_accounts`, nunca por el puuid del LCU (36 caracteres, distinto
del de match-v5; nota de la Fase 2).

**Móvil:**
- `expo-notifications` + `expo-dev-client`; registro del token al iniciar
  sesión (`push-notifications.ts`, cargado perezosamente y solo fuera de Expo
  Go, como en RiftLens) → upsert en `lanepulse_push_tokens`. El manejador
  del toque ignora cualquier notificación cuyo `data.app` no sea
  `lanepulse` (las de coaching de RiftLens no deben abrir nada aquí).
- Profile → "Goal updates during games": interruptor (off por defecto) y, si
  está on, "Only when my status changes" / "Every 5 minutes". Se guarda en
  `notification_prefs`. Texto bajo el interruptor: "Status only — never tips."
- Tocar la notificación abre la pestaña Live.

### 2.5 Build de desarrollo (EAS)

Expo Go no entrega push remoto. Se añade `eas.json` (perfiles `development`
con `developmentClient` y simulador iOS, `preview`, `production`) y
`expo-dev-client`. `eas init` (projectId) requiere la cuenta Expo del owner;
iOS en dispositivo requiere Apple Developer Program y clave APNs; Android
requiere credenciales FCM. El builder deja el proyecto configurado y un
`docs/riot/build.md` con los pasos exactos para el owner; la aceptación de
2.4 se hace en el build de desarrollo (Android o iOS, lo que tenga el owner).

### 2.6 Datos nuevos

```sql
create table public.lanepulse_push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  expo_token    text not null,
  platform      text not null check (platform in ('ios','android')),
  app_version   text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (user_id, expo_token)
);
-- RLS: select / insert / update / delete own; grants a authenticated; all a service_role.

create table public.notification_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  goal_push      boolean not null default false,
  goal_push_mode text not null default 'change' check (goal_push_mode in ('change','interval')),
  updated_at     timestamptz not null default now()
);
-- RLS: select / insert / update own; grants a authenticated; all a service_role.
```

Migraciones en `supabase/migrations/` de este repo, copiadas a RiftLens y
aplicadas con `supabase db push` (el builder muestra el comando antes).

### 2.7 La solicitud (documento)

`docs/riot/application.md`, en inglés, con todo lo que pide el formulario
"Register Product":

- Nombre, descripción detallada (qué hace, para quién, qué NO hace), regiones
  objetivo, plataformas, URLs (sitio, términos, privacidad), contacto.
- **Datos de Riot usados** por endpoint (account-v1 por Riot ID, match-v5 ids
  / detalle / timeline; Live Client Data API local y LCU para el desktop) y
  qué se muestra con cada uno.
- **Cache y presupuesto de llamadas** con cifras reales: por usuario y día en
  el peor caso (Matches: 1 `match-list-ids` cada 90 s mientras se mira la
  lista + detalles nuevos; Performance/Prepare: 1 `match-list-ids(100)` cada
  10 min + hasta 100 detalles una sola vez por cuenta; review: 1 timeline por
  partida una vez), y por qué cabe de sobra en 500 req/10 s.
- **Auto-chequeo de políticas**: tabla con cada regla (sin ventaja injusta,
  sin "solving the game", sin información de sesión desconocida para el
  jugador, sin datos de otros jugadores, disclaimer visible, free tier) y
  dónde se cumple en el producto, con captura.
- Lista de capturas a tomar con la cuenta real del owner (Matches, review,
  Live, Prepare, Performance, Profile con legal, desktop con disclaimer,
  sitio público).

RSO/OAuth: **no se solicita** en esta fase. Solo se exige para mostrar
públicamente datos de partidas personalizadas de otros jugadores; LanePulse
muestra datos del propio jugador vinculado por Riot ID.

## 3. Objetivos, no-objetivos, anti-objetivos

**Objetivos:** sitio público + legal enlazado desde la app; canal privado;
avisos de estado opt-in que funcionan en un build de desarrollo; documento de
solicitud completo con cifras; cero cambios en el motor de análisis.

**No-objetivos:** RSO; instalador macOS firmado; Windows; sincronización fin
de partida → review (fase siguiente); monetización; Sign in with Apple.

**Anti-objetivos:** cualquier texto en una notificación que suene a consejo
("farm more", "ward"); enviar push sin opt-in; un canal público que siga
vivo "por compatibilidad"; páginas legales con huecos "TBD"; una cifra del
presupuesto de llamadas no verificada contra el código.

## 4. Restricciones

Las de siempre (sin secretos; Riot solo vía Edge Functions; UI en inglés;
`pnpm -r typecheck/lint/test` verdes por tarea; disclaimer visible). Además:
`expo-notifications` solo se carga fuera de Expo Go (lazy require) para que
Expo Go siga funcionando en desarrollo; el desktop nunca envía push si
`goal_push` es false; el poller no espera a la red del push.

## 5. Lo que queda al builder

Estilo del sitio (mismos colores de la app), estructura de secciones de los
textos legales, nombre exacto del helper del canal, formato del documento de
solicitud, scripts de build del sitio.

## 6. Decisiones del owner (respondidas el 2026-10-22)

1. **Dominio:** todavía no hay; se despliega en la URL por defecto de Vercel
   (`lanepulse.vercel.app` o la que asigne) y el dominio propio se añade más
   adelante sin cambiar nada del sitio. Cuenta de Vercel: la del owner.
2. **Email de contacto:** `alfredodevelop@gmail.com` (legal y solicitud).
3. **Cuenta Expo / Apple Developer:** pendiente; `eas init` lo ejecuta el
   owner cuando toque (`! eas login` en esta sesión). Si no hay Apple
   Developer Program, la aceptación de 2.4 se hace en Android.
4. **Regiones objetivo:** el owner no está seguro. Decisión del builder: la
   solicitud declara las regiones que la app ya ofrece en el selector
   (`REGIONS`: NA, EUW, EUNE, KR, LAN, BR, JP, OCE, TR, RU), con NA como
   principal; se puede recortar antes de enviar.
5. **Nombre legal:** el owner no está seguro. Decisión del builder: los textos
   legales nombran al responsable como "LanePulse (an independent developer)"
   con el email de contacto, marcado `<!-- LEGAL_ENTITY: revisar antes de
   publicar -->` en la fuente para sustituirlo por persona o empresa.
