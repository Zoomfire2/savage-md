// SAVAGE MD — optional process supervisor (for hosts WITHOUT pm2/systemd/docker restart policies,
// e.g. a plain Pterodactyl panel). Start with:  node supervisor.js   (or: npm run start:supervised)
//
// It runs `node index.js` as a child and restarts it if it exits or crashes:
//  - exponential backoff (1s .. 60s); backoff resets after the child stayed up 5 minutes
//  - crash-loop guard: >8 exits in 10 minutes => waits 10 minutes before trying again
//  - exit code 78 (another instance is already running on these sessions) => does NOT restart
//  - SIGTERM/SIGINT are forwarded to the child for a graceful shutdown, then the supervisor exits
//  - never touches sessions/, creds, or the database; every exit is recorded in data/health/history.json
// NOTE: a supervisor cannot revive a container that the host itself killed. In that case rely on the
// host's own restart policy (see RECOVERY.md).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const HEALTH_DIR = path.join(__dirname, 'data', 'health');
const MAX_EXITS = Number(process.env.SUPERVISOR_MAX_EXITS) || 8;
const WINDOW_MS = Number(process.env.SUPERVISOR_WINDOW_MS) || 10 * 60 * 1000;
const COOLDOWN_MS = Number(process.env.SUPERVISOR_COOLDOWN_MS) || 10 * 60 * 1000;
const BACKOFF_MAX_MS = Number(process.env.SUPERVISOR_BACKOFF_MAX_MS) || 60 * 1000;
const STABLE_MS = Number(process.env.SUPERVISOR_STABLE_MS) || 5 * 60 * 1000;
const CHILD = process.env.SUPERVISOR_CHILD || path.join(__dirname, 'index.js');

let child = null;
let stopping = false;
let streak = 0;
let exits = [];

function log(msg) { console.log(`[SUPERVISOR ${new Date().toISOString()}] ${msg}`); }

function record(reason, detail) {
  try {
    fs.mkdirSync(HEALTH_DIR, { recursive: true });
    const file = path.join(HEALTH_DIR, 'history.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { /* first run */ }
    list.push({ ts: Date.now(), at: new Date().toISOString(), type: 'supervisor_restart', reason, detail, pid: process.pid });
    const tmp = file + '.sup.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list.slice(-200)));
    fs.renameSync(tmp, file);
  } catch (_) { /* history is best-effort */ }
}

function start() {
  if (stopping) return;
  const startedAt = Date.now();
  child = spawn(process.execPath, [CHILD], { stdio: 'inherit', env: process.env, cwd: __dirname });
  log(`started child pid ${child.pid}`);
  child.on('error', (err) => log(`spawn error: ${err.message}`));
  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) { log('child stopped; supervisor exiting'); process.exit(0); }
    const upMs = Date.now() - startedAt;
    log(`child exited (code ${code}, signal ${signal}) after ${Math.round(upMs / 1000)}s`);
    if (code === 78) {
      log('exit code 78 = another instance owns these sessions (or fatal config). Not restarting.');
      record('child exited 78 - not restarting', `uptime ${Math.round(upMs / 1000)}s`);
      process.exit(78);
    }
    const now = Date.now();
    exits = exits.filter((t) => now - t < WINDOW_MS);
    exits.push(now);
    streak = upMs >= STABLE_MS ? 0 : streak + 1;
    let delay = Math.min(1000 * 2 ** Math.max(0, streak - 1), BACKOFF_MAX_MS);
    if (exits.length > MAX_EXITS) {
      delay = COOLDOWN_MS;
      log(`crash loop: ${exits.length} exits in ${Math.round(WINDOW_MS / 60000)} min. Cooling down ${Math.round(COOLDOWN_MS / 1000)}s (saved sessions are untouched).`);
      exits = [];
      streak = 0;
    }
    record(`child exited code=${code} signal=${signal}`, `uptime ${Math.round(upMs / 1000)}s, restarting in ${Math.round(delay / 1000)}s`);
    setTimeout(start, delay);
  });
}

function stop(sig) {
  if (stopping) return;
  stopping = true;
  log(`${sig} received, asking the bot to shut down gracefully`);
  if (!child) process.exit(0);
  try { child.kill(sig); } catch (_) { /* already gone */ }
  setTimeout(() => { try { child && child.kill('SIGKILL'); } catch (_) { /* ignore */ } process.exit(0); }, 20 * 1000).unref();
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
start();
