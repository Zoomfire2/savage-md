# SAVAGE MD — WhatsApp stability, health monitor & recovery

## Root cause found
Every inbound WhatsApp message takes a slot in a bounded gate (per session, `WA_INBOUND_PER_SESSION`, default 12).
The slot was freed only when a command *started* or the handler *returned*. A handler that hung earlier
(database / network / media call without a timeout) kept its slot forever. After 12 such leaks the session
silently stopped processing messages while its socket still looked "connected" and the transport liveness
probe kept passing — and Telegram is a separate pipeline, so it kept working. Heavy traffic (many users) makes
this far more likely, which matches "stops after 1–2 days, worse with many users".

Fix: every held slot is tracked; any slot held longer than `WA_GATE_HOLD_MS` (90 s) is force-freed and counted.
If `WA_WEDGE_FORCED_RELEASES` (5) handlers hang within 10 minutes, the session pipeline is treated as wedged and
the session is reconnected from its saved login.

Also fixed: sessions interrupted mid-reconnect (status `pairing` with real credentials) were not restored on boot.

## Health monitor (runs on its own timer, every `WA_HEALTH_INTERVAL_MS`, default 30 s)
Per session it tracks: connection state, time in that state, inbound/processed/failed/shed counts, held gate slots,
forced releases, liveness-probe failures. Detects: `down` (not connected > `WA_DOWN_GRACE_MS`, 180 s), `no_socket`,
`processing_wedged`, `stale_socket`. Short inactivity is NOT a failure (no traffic alone never triggers anything).
It also watches RAM/heap, event-loop delay and the inbound backlog. A failure inside one session's check never stops
the monitor or other sessions.

## Recovery ladder (never deletes/clears/logs out anything)
1. **Session recovery** — only the affected session: dispose its socket and rebuild it from the EXISTING auth state.
   Backoff `WA_RECOVERY_BACKOFF_MS` (30 s) doubling up to `WA_RECOVERY_BACKOFF_MAX_MS` (10 min), at most
   `WA_RECOVERY_MAX_ATTEMPTS` (4) fast attempts, then slow retries only.
2. **Subsystem restart** — if half or more of the sessions (min 2) have failed recovery: rebuild those connections
   one by one (staggered). Cooldown `WA_SUBSYSTEM_RESTART_COOLDOWN_MS` (30 min).
3. **Controlled process restart** — only if step 2 did not help, or memory stays critical (`WA_HEAP_CRITICAL_PCT` 95 %
   for 3 checks). Graceful shutdown, exit code 75 so panels/PM2/Docker restart it. Loop guard: at most
   `WA_PROCESS_RESTART_MAX_PER_HOUR` (3) restarts/crashes per hour, and never twice within 10 min of boot;
   otherwise the owner is told and nothing restarts. Disable with `WA_PROCESS_RESTART_ENABLED=false`.
Recovery is **verified**: an incident closes only when the session is connected AND answers a live server round-trip
using its existing login. (A real incoming user message cannot be fabricated, so "processing works again" is shown by
the round-trip plus the processed counter resuming; check with the owner health command.)
A session WhatsApp itself reports as logged out (401) cannot be recovered; the owner is told and it must be re-paired.

## Owner notifications (Telegram, to OWNER_IDS)
Unresponsive session · recovery failed · subsystem restart · process restart · restart loop prevented · WhatsApp working
again · high memory / event-loop lag / backlog · auth error (logged out) · restart after crash · repeated unhandled errors.
Each includes session, time, action and status; one message per incident, cooldown `WA_HEALTH_NOTIFY_COOLDOWN_MS` for
resource alerts.

## Crash history & single instance
`data/health/history.json` — restarts, crashes (unclean exits detected on next boot), incidents, recoveries.
`data/health/instance.lock` + `run-state.json` — a second bot started on the same folder waits up to 35 s, then
exits with code 78 instead of fighting over the sessions. Sessions/credentials are never read or changed by these files.

## Supervision — pick what matches your host
* **VPS**: `pm2 start ecosystem.config.js && pm2 save && pm2 startup` (or a systemd/Docker `restart: always` policy).
* **Pterodactyl panel (no PM2)**: set the startup command to `node supervisor.js` (same as `npm run start:supervised`).
  It restarts the bot after crashes with backoff and stops looping after repeated crashes.
  Also enable the panel's "auto restart on crash" if your egg has it.
* **Render / Railway**: the platform restarts the service itself; keep `instances = 1`.
Important: a JavaScript timer cannot revive a process/container that the host killed. If the HOST stops the container
(out of memory, node maintenance), only the host's restart policy can bring it back; on the next start the bot restores
every saved session automatically.

## Capacity
Bounded queues + per-session isolation (`WA_INBOUND_*`), bounded broadcast concurrency (`WA_BROADCAST_*`), cache
cleanup at 85 % heap, shedding beyond the queue cap instead of blocking. 100–300 sessions need enough RAM/CPU
(roughly 40–80 MB per connected session; set `NODE_HEAP_MB` accordingly) and are subject to WhatsApp's own limits.
No unlimited capacity is promised.

## Not done / honest limits
* Not run against live WhatsApp here (no network in the build sandbox); logic was tested with simulated sockets,
  a real SQLite database and a fake child process. Do one supervised test run on your server.
* Existing per-session auto-reconnect, watchdog probe and resource auto-restart were kept as they were.
