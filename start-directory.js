'use strict';
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
function normalizeUsername(value) {
  const name = String(value || '').trim().replace(/^@/, '');
  if (name && !USERNAME.test(name)) throw Error('BOT_USERNAME must be your Telegram bot username, without a link.');
  return name;
}
function createDirectory({ reporter, fetchFn = fetch, now = Date.now }) {
  let cached, expires = 0, pending;
  async function load() {
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      const state = reporter.snapshot();
      if (!state.url || !state.clone_id || !state.clone_key) throw Error('directory_unavailable');
      const response = await fetchFn(new URL('/api/public/clone/config', state.url), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clone_id: state.clone_id, clone_key: state.clone_key, directory_only: true }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error('directory_unavailable');
      const body = await response.json();
      if (!body.ok || !Array.isArray(body.active_bots)) throw Error('directory_unavailable');
      cached = [...new Set(body.active_bots.filter((n) => typeof n === 'string' && USERNAME.test(n)))];
      expires = now() + 30000;
      return cached;
    })();
    try { return await pending; } finally { pending = undefined; }
  }
  return async function send(ctx) {
    try {
      const names = await load();
      if (!names.length) return await ctx.reply('Active running bots\n\nNo active bots reported right now.');
      for (let offset = 0; offset < names.length; offset += 40) {
        const batch = names.slice(offset, offset + 40);
        await ctx.reply(`Active running bots (${names.length})\n\n${batch.map((name) => '@' + name).join('\n')}`, {
          reply_markup: { inline_keyboard: batch.map((name) => [{ text: '@' + name, url: 'https://t.me/' + name }]) },
          link_preview_options: { is_disabled: true },
        });
      }
    } catch {
      try { await ctx.reply('Active bot list is temporarily unavailable.'); } catch {}
    }
  };
}
function install(Telegraf, send) {
  const prototype = Telegraf.prototype;
  const original = prototype.command;
  prototype.command = function (command, ...handlers) {
    if (command !== 'start' || typeof handlers[handlers.length - 1] !== 'function') return original.call(this, command, ...handlers);
    const handler = handlers.pop();
    return original.call(this, command, ...handlers, async (ctx, next) => {
      const result = await handler(ctx, next);
      await send(ctx);
      return result;
    });
  };
}
module.exports = { normalizeUsername, createDirectory, install };