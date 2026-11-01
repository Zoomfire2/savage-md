// PM2 config (VPS). Usage: pm2 start ecosystem.config.js && pm2 save && pm2 startup
// Saved WhatsApp logins live in ./sessions and are never touched by restarts.
module.exports = {
  apps: [{
    name: 'savage-md',
    script: 'index.js',
    cwd: __dirname,
    instances: 1,            // NEVER raise: two processes would fight over the same sessions
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 20,
    min_uptime: '60s',       // exits sooner than this count as an unstable start
    restart_delay: 5000,
    exp_backoff_restart_delay: 2000,
    kill_timeout: 20000,     // time for the graceful shutdown (keeps sessions' saved state)
    max_memory_restart: '6G',
    stop_exit_codes: [78],   // 78 = duplicate instance: do not restart
    env: { NODE_ENV: 'production' }
  }]
};
