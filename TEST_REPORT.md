# SAVAGE MD V3.4.2 — Test Report

## This update
- New automated tests cover active/stale/offline filtering, latest created-bot inventory, username-only results, username validation, existing /start handler preservation, non-start pass-through and unavailable-directory fallback.
- Original scrambled bot.js, central.js, global-admin.js, supervisor and recovery code are unchanged from V3.4.1. Only a start-handler wrapper and username setup were added.
- Live Telegram /start delivery and production directory access still require publication and a running bot; automated tests are not proof of live delivery.

## Passed in this revision
- Two required channels: SavageEcTech and SavageTechClass; original community URL retained.
- Original runtime command catalogs and scrambled runtime catalogs compare byte-for-byte after plugin loading: 47 Telegram entries; WhatsApp catalog preserved. This checks registration, not execution of every command.
- Six bot-rule tests pass against scrambled global-admin code on Node 22.23.4 and Node 24.14.0: channels/community, command registration, inventory retry and independent unpair state, group counts per number/bot, normal-command pass-through, simulated verified global health and bot selection.
- Scrambled startup reaches simulated Telegram launch and central start on Node 22.23.4 and Node 24.14.0. Real WhatsApp/Telegram connections are not used by this startup test.
- Five central app tests pass: global deduplicated totals, deployment alert creation, suppressed unpair alerts, phone masking and root routing.
- Real local central endpoint accepts inventory reports (200); rejects invalid clone key (401), unverified main-admin stats access (401), and non-admin access (403). Temporary test deployment removed.
- Browser opens the central sign-in page with no runtime errors. Latest recorded app build is OK.

## Not verified / still required
- Successful real Telegram code delivery and signed-in global commands; simulated command tests do not prove delivery.
- Real deployment alert receipt by both admins. Alert generation/queue implementation is present; both admins must start the alert bot.
- Real WhatsApp pairing, recovery and third-party service commands on your server.
- Publishing the latest central-site changes. This ZIP requires the updated central endpoint; publication was not requested in this turn.

## Preservation and package
- Existing supervisor, PM2 configuration, session recovery, command handlers, assets and community button preserved. No unpair/auth-error alert is re-enabled.
- Public .env contains only blank OWNER_ID, BOT_TOKEN and BOT_USERNAME. Runtime data, sessions, clone keys, dependencies and repository metadata are excluded.
- Code is obfuscated, not tamper-proof encryption. Updates must replace code only and preserve your own .env, central state and sessions.

## V3.4.3 changes
- Root cause of missing deployment alerts: deployed bots had no central site address unless setup-central was run manually, so nothing was ever reported. The address is now built in.
- New deployment alert ("🚀 SAVAGE MD | NEW BOT DEPLOYED") is sent only after Telegram accepts the token and the bot has started, with the real username from Telegram. Each bot username alerts once per deployment. Old startup alerts removed.
- Main bot (@savagemdencbot) /start lists every live bot username.
- VERIFY button: if the bot cannot read channel members (not an admin), the user is let through as an "unverified bypass", and the confirmation says so. Normal checks still run when the bot can read members.
- Passed (simulated Telegram): failed token sends no alert; successful start reports the real username; verify bypass labelled honestly; other member checks unaffected.
- Not verified: real Telegram delivery to both admins, real clone deployments.
- Not changed: the clone setup step that asks the clone owner for their own ID (the two super admin IDs are built in and never asked for).
