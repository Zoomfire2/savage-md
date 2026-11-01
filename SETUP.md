# SAVAGE MD Public V3.4.3 — Setup

1. Publish the SAVAGE MD Central site in Lovable. The preview address is not a production endpoint.
2. Download and extract `SAVAGE_MD_PUBLIC_V3.4.3.zip` on your own server. Use Node.js 22.5+; Node 24 is supported.
3. Set `OWNER_ID`, `BOT_TOKEN` and `BOT_USERNAME` in `.env`. BOT_USERNAME is your own bot's username, without `t.me/` (a leading @ is accepted). Telegram's actual username is used after launch, so a typed name cannot impersonate another bot. Existing installations without this field can still boot. The owner ID identifies the clone owner; it does not grant main-admin access. The two original main-admin IDs are built into the scrambled bot.
4. Run `npm install --omit=dev --legacy-peer-deps`.
5. Run `npm run setup:central` and enter the published HTTPS site address. This is stored locally outside `.env`.
6. Run `npm start`, or `npm run start:supervised` for the existing restart supervisor.
7. Both main admins must press Start on the separate alert bot before receiving alerts or login codes.
8. In Central, sign in using a main-admin Telegram ID and its delivered six-digit code. Save your real shared service keys in Shared settings.

## Sessions and updates
- Keep each deployment in its own directory. Never copy `.central-state.json`, databases, or sessions from one clone to another.
- For an upgrade, stop the bot, back up its current files, replace code only, and retain `.env`, `.central-state.json`, database, and session directories.
- No update is automatically installed. Release notices go to the clone owner.
- Reports queue locally and retry with the same event keys. Shared settings refresh every six hours; static settings may need a bot restart to take effect.
- Unpaired sessions still clear their own credentials and free their slot. No unpair/auth-error alert is sent.

## Limits and security
- The central URL is configured once because the latest central-site changes need publishing.
- Open registration means a clone key is not proof of the claimed owner's Telegram identity. Any registered clone receives enabled shared settings; do not use high-privilege keys.
- Obfuscation discourages casual editing, not copying or determined reverse engineering.
- Cutting off settings does not stop a clone or erase keys already copied. Existing in-memory settings can persist until restart.
- The files contain no real bot tokens or shared API keys. `.central-state.json` contains deployment credentials and cached keys at runtime: keep it private.
- Real WhatsApp pairing, service commands, and admin sign-in must still be validated with your actual accounts. See the test report for exactly what was checked.

## New global admin commands
- The required Telegram channels are @SavageEcTech and @SavageTechClass. The existing community button is preserved; the old hub and giveaway channels are no longer mandatory. Telegram bots must be admins in both channels to verify membership.
- Main admins can use /health and /dashboard for global paired people, sessions and deployments. /checkgc groups numbers beneath their deployed/created bots. /bot displays a selectable list; tap a bot to see its details. Other commands keep their existing scope and behavior.
- First use sends a code through the central alert bot. In the deployment bot, send /centralcode followed by that code. Access lasts 12 hours in that running bot; restart requires verification again. Never send a code to an untrusted bot.
- Bot/group inventories refresh every two minutes. Group counts that cannot be fetched are marked unavailable, not zero. Offline deployments show their last recorded inventory. Older deployments need this update to send created-bot inventories.
- Deployment reports queue and retry. Both main admins must start the alert bot; Telegram can otherwise reject delivery.

## Normal /start
- The original welcome and join checks are preserved. After the welcome, /start lists active deployed bots and running created bots by username, with buttons to open each bot.
- The list contains usernames only, never owners, paired numbers or admin statistics. No admin code is needed to view it.
- A deployment must have reported within the last 20 minutes and not be offline. Created bots must be marked running in a recent inventory. Results refresh after at most 30 seconds of local caching.
- If Central is unavailable, the normal welcome still works and the list reports that it is unavailable rather than showing stale bots.
