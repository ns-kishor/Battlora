# Battlora — Worklog

---
Task ID: 1
Agent: Main agent (Super Z)
Task: Build complete "Battlora" Free Fire Esports Tournament Management Platform from PRD v1.0

Work Log:
- Classified task as Type 3 (Interactive Web Development); loaded fullstack-dev skill and initialized environment
- Designed Prisma schema (18 models): User, Session, Team, Player, Tournament, Registration, Payment, Match, MatchResult, Complaint, Evidence, Penalty, Announcement, Notification, Prize, ActivityLog, PlatformSettings → pushed to SQLite
- Built core libs: scrypt password hashing + httpOnly cookie sessions (src/lib/auth.ts), RBAC permission matrix for 7 roles (src/lib/types.ts), scoring engine with placement+kill points, tie-breaks, penalty deductions (src/lib/scoring.ts), activity logger + notification helpers + sequential IDs (src/lib/activity.ts)
- Built 30+ API routes: auth (register/login/logout/me), public tournament data, control-center aggregate, registration submission (7-step wizard backend), payment verify/reject/refund/resubmit, match CRUD, room publish with timed release, result entry/save/publish with correction audit trail, leaderboard computation (polling), complaints with evidence, penalties with zero-tolerance DQ/ban, announcements, notifications, admin stats/users/teams/players/settings/search, tournament lock (prize auto-assignment)
- Built frontend SPA at "/" (single route constraint) with hash-based router, dark esports theme (near-black #0a0e16, orange #FF7A1C accent, Rajdhani display font), mobile-first responsive layouts
- Public pages: Home (hero BATTLE. COMPETE. CONQUER., 4 stat cards, featured tournament, how-it-works, announcements), tournament listing with status filters, tournament detail with 9 tabs (Overview/Rules/Schedule/Matches/Teams/Leaderboard/Announcements/Prizes/FAQ), winners panel for completed tournaments, auth views with one-click demo logins
- 7-step registration wizard: Account → Team → Players (UID validation) → Substitute → Payment (screenshot upload with client-side canvas compression) → Agreement → Review/Submit → REG ID
- Team Captain dashboard (10 sections): overview KPIs, my team (roster mgmt), matches, room details (masked credentials until release time), results, leaderboard, complaints (submit w/ evidence), notifications, payment (resubmit after rejection), rules
- Admin panel (13 sections): dashboard with 8 KPIs, tournament creation form, Tournament Control Center (quick actions, teams/payment verification, match+room management, result entry with live auto-scoring preview, complaints review, penalties, announcements, prizes, lock final results), teams, players (UID search), payments, complaints, penalties, announcements, users/roles, activity logs with prev→new value diffs, platform settings (accent color, payment methods, FAQ)
- Seed script (prisma/seed.ts) with sharp-generated images: 4 tournaments (ongoing/registration-open/closed/completed+locked), 12 teams with players, matches with results, complaints+evidence, penalty, notifications, audit logs, prizes

Stage Summary:
- Fixed: NavLinks component defined during render (lint error), API route exports, publish-timed room payload
- E2E verified via agent-browser: home/leaderboard/detail render; captain login → dashboard KPIs → locked room credentials; admin login → KPIs → control center → result entry (10 teams, auto-scoring 12+10=22 etc.) → publish → leaderboard auto-update (Team Alpha 79→96) + notifications + audit log; payment verification → registration approval state machine; full 7-step wizard with new user → REG-2026-00028 → payment verify → team approve; mobile 390px no-overflow + compact leaderboard cards; auth guards redirect
- Demo accounts: admin@battlora.gg / Admin@123 (Super Admin), captain@battlora.gg / Captain@123 (Team Alpha captain)
- Lint: 0 errors. Dev server: all routes 200, no runtime errors

---
Task ID: 2
Agent: Main agent (Super Z)
Task: Remove "Demo accounts (one-click)" section from the login page

Work Log:
- Removed DEMO_ACCOUNTS constant, quickLogin() helper, and the one-click demo accounts JSX block from src/components/battlora/public/auth-view.tsx
- Verified no leftover references (rg for DEMO_ACCOUNTS/quickLogin/Demo accounts → 0 matches)
- ESLint on the file: 0 errors
- Browser-verified via agent-browser: /#/login renders form + footer link only, demo section gone
- Sanity check: POST /api/auth/login with admin credentials still returns SUPER_ADMIN user (manual login unaffected; seeded accounts still exist in DB)

Stage Summary:
- Login page no longer exposes demo account emails/passwords; sign-in must be done manually with credentials
- No dead code left behind; auth flow unchanged

---
Task ID: 3
Agent: Main agent (Super Z)
Task: Make UI more professional with gaming vibe; add Free Fire themed banners/artwork

Work Log:
- Generated 7 AI artworks (1440x736, dark navy + orange ember palette, textless) via z-ai-web-dev-sdk → public/images/: hero-bg, banner-pro-series, banner-weekend-clash, banner-community-cup, banner-champions-league, cta-bg, auth-bg (scripts/generate-art.mjs, supports single-file regen filter)
- VLM QA loop: rejected hero v1 (baked-in Chinese text) + champions banner v1 (Chinese text) → regenerated with stronger anti-text prompts; final all pass (8-9/10)
- Patched DB tournament.bannerUrl to new artwork (scripts/update-banners.mjs); updated prisma/seed.ts to reference static images (removed SVG bannerImage generator)
- globals.css: added .hero-art (image+scrim+grid layers with explicit z-index stacking), .banner-scrim, .hud-corners (bracket accents), .text-glow, .slash-accent (section titles), .prize-shimmer, .auth-scrim, mobile scrim media query
- home.tsx: hero now full-bleed soldier artwork w/ gradient scrim + animated LIVE chip (links to ongoing tournament), stat cards with HUD corners, featured card with banner-scrim + prize chip + LIVE badge, CTA section over ember artwork
- tournament-card.tsx: taller banner, slower zoom on hover, prize chip + "N slots left" urgency chip over artwork
- tournament-detail.tsx: banner header raised to h-64/sm:h-80
- auth-view.tsx: atmospheric artwork backdrop + scrim behind glass card with HUD corners
- kit.tsx: SectionHeader titles get slash-accent

Stage Summary:
- ESLint 0 errors; dev server compiles clean (only HMR logs in console)
- VLM reviews: homepage 9/10 ("production-ready, competitive with Battlefy/Challengermode"), mobile 390px hero/card/login all PASS, detail page 9/10 (only "artifact" = nextjs-portal dev-tools indicator, not app UI), list page all 4 banners + chips clean
- Verified z-index layering fix (scrim above artwork, content above scrim) via browser eval

---
Task ID: 4
Agent: Main agent (Super Z)
Task: Install user-uploaded logo as the main site-wide logo of Battlora

Work Log:
- VLM-analyzed uploaded emblem (upload/ChatGPT_Image_Sep_21__2026__07_28_34_PM-removebg-preview.png): pure symbol (angular red "B", ~#E60000, transparent bg), no wordmark → keep BATTLEORA text beside it
- scripts/install-logo.mjs (sharp): trimmed transparent padding (500x500 → 262x290 content), saved tight 512px emblem to public/images/logo.png; generated 512x512 favicon (emblem at 88%) to src/app/icon.png; removed unreferenced public/logo.svg
- kit.tsx BrandLogo: replaced Crosshair icon-in-box with <img src="/images/logo.png"> (sm 22 / md 26 / lg 46 px) + BATTLEORA wordmark; dropped unused Crosshair import
- globals.css: added .logo-glow (subtle red ember drop-shadow, restrained per PRD)
- Component is shared → logo now appears on public navbar, mobile drawer, footer, login/register pages, register wizard, admin sidebar, dashboard, and app fallback screen; favicon now shows emblem in browser tab (site previously had none)

Stage Summary:
- ESLint 0 errors; /images/logo.png and /icon.png both 200 image/png
- VLM QA: login page (logo + wordmark above glass card, sharp, aligned) PASS; desktop navbar PASS (no regression); mobile 390px PASS (no overflow/collision with hamburger); processed logo QA PASS (clean crop, nothing cut off)

---
Task ID: 5
Agent: Main agent (Super Z)
Task: Admin panel feature — admins can change their own name, login email, and password

Work Log:
- New API PATCH /api/me/account (src/app/api/me/account/route.ts), self-scoped to the session user:
  - Name validation (2–60 chars); email validation + lowercase normalization + uniqueness check excluding self (409)
  - Email or password changes require the current password (400 if missing, 403 if wrong)
  - Password change: new hash via scrypt, revokes all OTHER sessions (current session kept alive)
  - Idempotent no-op returns current user; audit log entries (no password material logged) + SECURITY notifications to self on email/password change
- New admin section src/components/battlora/admin/account.tsx ("My Account"):
  - Identity summary (name, RoleBadge, StatusBadge)
  - Profile card: Full Name + Login Email; changing the email dynamically reveals a "Current Password" confirmation field; Save Profile disabled until dirty; calls auth refresh() so the sidebar chip updates instantly
  - Password card: Current/New/Confirm fields with show-hide toggles and inline validation (min 6, match, must differ); hint that other devices get signed out
- Wiring: ADMIN_NAV entry "My Account" (CircleUserRound icon, last item) in admin-layout.tsx; sidebar user chip converted to a clickable button that navigates to /admin/account; route case "account" → AdminAccount in app.tsx
- Everything else untouched (no changes to existing pages, APIs, or captain dashboard)

Stage Summary:
- Full-project ESLint: 0 errors
- API guards verified via curl: 401 unauthenticated, 400 missing password, 403 wrong password, 409 duplicate email, 400 short name, 200 no-op
- E2E via agent-browser (fresh session): login → name change (sidebar live update) → email change to kishor@battlora.gg w/ password confirm → password change to Admin@456 → sign out → login with new credentials OK → all values restored to originals (Kishor Ahmed / admin@battlora.gg / Admin@123)
- Security behaviors verified: old session cookie revoked after password change (user:null); "Login email changed"/"Password changed" SECURITY notifications received; audit log shows prev→new diffs for profile, action-only for password
- Note: mid-test an agent-browser session glitch made physical clicks silently stop reaching the page (JS clicks + eval still worked; fixed by browser restart) — NOT an app bug; after restart all physical clicks worked
- VLM QA desktop + mobile 390px: professional, no overflow/breakage

---
Task ID: 6
Agent: Main agent (Super Z)
Task: Integrate a powerful AI Assistant (OpenAI + Google Gemini providers) site-wide

Work Log:
- Provider architecture (src/lib/ai/providers.ts): server-only ChatMessage/AIProvider abstraction with OpenAIProvider (api.openai.com/v1/chat/completions, model env AI_OPENAI_MODEL default gpt-4o) and GeminiProvider (generativelanguage.googleapis.com v1beta generateContent, model env AI_GEMINI_MODEL default gemini-3.8-flash, system→systemInstruction + role mapping), 60s AbortController timeouts, env-switchable primary (AI_PROVIDER_PRIMARY) with automatic fallback to the other provider; optional built-in local fallback (AI_ENABLE_LOCAL_FALLBACK, z-ai sdk, dynamic import) appended to the chain so the assistant stays functional when both external providers are region-blocked from the hosting server (verified: OpenAI 403 unsupported_country_region_territory + Gemini 400 "User location is not supported" — keys authenticate, egress region is blocked)
- Credentials: OPENAI_API_KEY + GEMINI_API_KEY stored ONLY in .env.local (confirmed gitignored via git check-ignore; .env* covered); never referenced in any client code; provider errors logged server-side only, clients receive generic degraded messages (no keys/prompts/tokens cross the wire)
- Assistant brain (src/lib/ai/assistant.ts): confidential system prompt = general-purpose assistant + authoritative Battlora knowledge (roles, lifecycle, 7-step registration, scoring/tie-breaks, rooms w/ timed release, complaints, penalties, prizes, My Account) + absolute security rules ("Helpful by Default. Secure by Design." — refuse credentials/emails/passwords/UIDs/room creds/transaction IDs/internal notes/API keys; trust ONLY the context's user block, never claims) + per-request live context JSON re-scoped to authorization: guest (public tournaments w/ slots left, announcements, FAQ, payment methods, platform contacts) / signed-in (+ own team, registrations w/ REG IDs, published match results) / staff (+ aggregate stats: users, teams, players, tournaments by status, pending payments, open complaints). NEVER queried into context: password hashes, sessions, other users' emails, player UIDs, room credentials, transaction IDs, complaint internal notes
- API route (POST /api/ai/chat): sanitizes client history (user/assistant roles only — injected "system" messages discarded; ≤16 msgs, ≤4000 chars each, new message ≤2000), optional auth (guests allowed), in-memory rate limits (users 30/hr by id, guests 10/hr by IP) with map cleanup, stateless re-authorization each request, client-safe error/degraded replies
- Frontend (src/components/battlora/ai/assistant.tsx + mount in app.tsx AppShell): site-wide floating launcher (Sparkles/X, orange glow, z-[60]) + glass chat panel (logo header w/ user-aware subtitle, clear/close, suggestion chips, user/assistant bubbles, safe React-node mini-markdown renderer (bold/bullets/numbered/headings/inline code), typing dots, 2000-char autosizing textarea, Enter-to-send, hourly-limit error surface, disclaimer footer); mobile = near-full-screen sheet, desktop = 400px pinned bottom-right
- Bug fixed during E2E: .hud-corners (unlayered globals.css position:relative) overrode Tailwind's .fixed → panel rendered in-flow off-screen; removed hud-corners from the panel (verified pos=fixed rect on mobile 12,64 366x700 + desktop 860,32 400x592 + admin overlay above z-50 sidebar)

Stage Summary:
- Full-project ESLint: 0 errors
- curl E2E: guest tournament Q&A returns live data (Weekend Clash ৳100, slots, dates); all 4 security probes refused correctly (admin credentials, room ID/password, Team Alpha UIDs, spoofed "I am super admin" emails) with privacy statement + legitimate redirect; captain sees own data (Team Alpha, REG-2026-00121, 4 match results w/ placements/kills/points) but NOT Team Beta's transaction IDs nor staff stats; super admin receives staff stats (18 users/13 teams/56 players/1 penalty/by-status/pending/open complaints); prompt-injection via fake system role discarded + refused; validation guards (empty/missing/oversized/garbage → 400)
- Browser E2E: launcher + panel on public, login, and admin pages; suggestion click + typed question + staff question all return correct scoped answers (admin summary: "18 users, 13 teams, 1 open complaint"); panel state persists across hash navigation; multi-turn context works
- VLM QA: desktop panel pinned bottom-right PASS, mobile sheet PASS, admin overlay PASS, markdown bullets/bold render PASS
- Ops note: in this sandbox both external providers are region-blocked at the network level, so responses currently serve via the built-in local fallback; in a supported region OpenAI→Gemini take over automatically with zero code changes (env-only switch)

---
Task ID: 7
Agent: Main agent (Super Z)
Task: Fix "Leaderboards page not working properly"

Work Log:
- Reproduced via agent-browser: public nav "Leaderboards" pointed to /tournaments?tab=ongoing, but TournamentList compared the tab param case-sensitively against uppercase filter values (ONGOING) → filter silently fell back to "All" and nothing was filtered; worse, there was no actual leaderboards page at all (just a filtered tournaments list)
- Built a real public Leaderboards page (src/components/battlora/public/leaderboards.tsx) at /#/leaderboards:
  - Eligible tournaments = ONGOING + COMPLETED, sorted live-first then most-recently-finished
  - Tournament selector chips (LIVE dot for ongoing, aria tablist) + deep-link support via ?t=<slug|id>
  - Meta card: name, TournamentStatusBadge, "Final results locked" chip, prize pool, game/mode, match count, start date, View Tournament CTA
  - Reuses shared LeaderboardTable (desktop table + mobile cards + Overall/Kills/Booyah modes); 20s live polling when tournament is ONGOING; highlightTeamId from useAuth().team so signed-in users see their own row highlighted; "Your team is highlighted" hint; empty states for no standings-eligible tournaments
- Wiring: app.tsx PublicRouter "leaderboards" route case; public-layout.tsx NAV_LINKS Leaderboards → /leaderboards (desktop + mobile drawer share NAV_LINKS) + footer "Leaderboards" link in Compete column
- tournament-list.tsx bug fix: tab param now uppercased before matching, and filter re-syncs when ?tab= changes while the list stays mounted — implemented with React's "adjust state during render" pattern (lastTab state compare) because the new react-hooks/set-state-in-effect rule forbids effect-driven setState
- ESLint full project: 0 errors 0 warnings

Stage Summary:
- E2E verified: guest nav click → /#/leaderboards renders Pro Series standings (10 teams, Team Alpha #1 96 pts, LIVE badge); chip switch to Champions League updates URL to ?t=battlora-champions-league-2025 and shows final standings (Team Charlie #1 86 pts); deep link /#/tournaments?tab=completed selects Completed + filters to 1 tournament; lowercase tab=ongoing + in-place hash change re-applies filter (case + stale-query bugs fixed)
- Captain session: Team Alpha row highlighted (bg-primary/10) + hint text; dashboard/leaderboard section unaffected (10 rows, no regression)
- Mobile 390px: no horizontal overflow, chips + compact standings cards render
- VLM QA on clean screenshots: desktop 10/10, mobile 10/10 (an initial VLM "table misalignment" complaint was disproven by DOM geometry — headerBottom=548/dataRowTop=548 flush, headerInsideCard, scrollWidth==clientWidth — and was a mid-interaction screenshot artifact; fresh screenshot passes all points)
- Console/dev-server clean after fresh reload (one stale HMR error during mid-edit state, gone on reload)

---
Task ID: 8
Agent: Main agent (Super Z)
Task: Prize Withdrawal System — winner payout requests + admin management

Work Log:
- Schema: new PrizeWithdrawal model (requestNo WDL-YYYY-NNNNN unique, prizeId @unique = one request per tournament+position → hard duplicate prevention, teamId, position 1|2|3 derived server-side, contactPhone, method bKash/Nagad/Upay/Rocket, accountNumber, status UNDER_REVIEW|APPROVED|PAYMENT_PROCESSING|PAID|REJECTED|REQUIRES_CORRECTION, adminNote winner-visible, submittedById, reviewedById/At, paidAt) + WithdrawalEvent model (immutable timeline: action/status/note/internal flag/actorName; internal notes never shown to winner); relations on Prize/Tournament/Team/User; prisma db push + regenerate + dev-server restart (running process keeps old client in memory)
- Server logic (src/lib/withdrawals.ts): positionFromPrizeName (mirrors lock-route naming 1st/champion/2nd/runner/3rd — kill/MVP prizes excluded from self-service per spec), phone/account/method validators (BD mobile ^(\+?880|0)?1\d{9}$, wallet 8–15 digits), assertWithdrawalEligibility (locked results + prize.winnerTeamId === team), getEligiblePrizes (eligible rows with NOT_SUBMITTED derived status + winner-visible event timeline), notifyWithdrawalStaff (SUPER_ADMIN+TOURNAMENT_ADMIN+FINANCE), WITHDRAWAL_ACTION_RULES state machine
- types.ts: WithdrawalStatus + labels incl. NOT_SUBMITTED, WITHDRAWAL_METHODS, POSITION_LABELS/MEDALS, WITHDRAWAL_EVENT_LABELS; activity.ts nextSequenceId extended with WDL prefix; kit.tsx WithdrawalStatusBadge + PositionMedal + status styles
- APIs: GET/POST /api/me/withdrawals (eligibility list + phone prefill; submit → validates, WDL no., UNDER_REVIEW, SUBMITTED event, audit log, winner confirmation + staff notifications, 409 duplicate, 403 not-winner/not-locked, 400 invalid phone/method/account) · PATCH /api/me/withdrawals/[id] (resubmit ONLY when REQUIRES_CORRECTION + owner check, → UNDER_REVIEW + RESUBMITTED event) · GET /api/admin/withdrawals (payments.view; full details + timeline incl. internal events + tournaments filter meta + stats) · PATCH /api/admin/withdrawals/[id] (payments.manage; APPROVE/REJECT/REQUEST_CORRECTION/MARK_PROCESSING/MARK_PAID/REOPEN/NOTE with from-status guards 409, note required for REJECT/CORRECTION/NOTE 400, eligibility re-verification before payout actions, MARK_PAID syncs Prize ledger to PAID+paidAt, every action audit-logged + winner notified with clear paid confirmation incl. amount/method)
- Frontend winner: dashboard/withdraw.tsx "Withdraw" section (nav item HandCoins) — auto-populated readonly Team/Tournament/Position/Amount + phone/method/account inputs, submit + resubmit-corrected form, summary grid (Tournament/Final Position/Prize Amount/Payment Status), admin message banner (tone by status), request details (RequestNo/method/account/phone), event timeline, rejected→"admin must reopen" lock note; ineligible users see "You currently have no eligible prize withdrawals."
- Frontend admin: admin/withdrawals.tsx "Prize Withdrawals" (nav after Payments) — status quick-filter chips with counts, tournament/position/method/status selects + search (requestNo/team/tournament/account/phone/submitter), request cards (team logo, medal, amount, submitted payment details), detail dialog (eligibility verified banner, full details, payment history timeline incl. internal-marked notes, action buttons per status), action dialog with note textarea (required where applicable); aria-describedby fix
- Ops fix discovered during VLM QA: platform accentColor had been left as #A855F7 (purple) in DB by an earlier session's settings E2E → restored brand default #FF7A1C (explains prior VLM "purple" remarks in Task 7); bootstrap refetch requires full page reload (hash nav is SPA)

Stage Summary:
- ESLint full project: 0 errors; console + dev.log clean
- curl E2E: eligibility correct (Charlie 1st ৳10,000 NOT_SUBMITTED; Alpha [] empty) · full lifecycle WDL-2026-00001 SUBMITTED→CORRECTION_REQUESTED(note shown to winner)→RESUBMITTED→APPROVED→PAYMENT_PROCESSING→NOTE(internal, hidden from winner)→PAID with Prize ledger synced, 5 winner notifications, 7 audit entries, 3 staff notified · WDL-2026-00002 REJECT(reason required 400 without)→resubmit blocked 409→REOPEN→resubmit OK · security: other team's prize 403, unlocked tournament 403, unauth 401, captain→admin action 403, duplicate 409, invalid transition 409, invalid phone/method 400
- Browser E2E: Ghost (3rd ৳4,000) form submit via UI (Upay + account) → toast + request view with timeline; Alpha sees empty message; admin panel list/stats/filters (Paid chip isolates WDL-1, search "Team Echo" isolates WDL-2), detail dialog (eligibility verified block + payment history), UI Approve action updates card to Approved + Mark Processing appears
- VLM QA: winner full view 10/10, admin list 10/10, mobile 390px 10/10 no-overflow (dashboard + admin); demo data left in 3 states (PAID/APPROVED/UNDER_REVIEW) for exploration

---
Task ID: 9
Agent: Main agent (Super Z)
Task: User report — "even after publishing final results, no withdrawal form is sent to 1st/2nd/3rd-place teams. Why?"

Work Log:
- Diagnosed via DB inspection (scripts/inspect-withdrawal-state.ts): the withdrawal feature itself works (Champions League locked → Charlie/Echo/Ghost forms + WDL requests all present), but the reported tournaments never reached the eligibility state. Root causes:
  1. Publishing per-match results is NOT the same as publishing final results — eligibility requires the explicit "Lock Final Results" step (resultsLocked=true + Prize.winnerTeamId assignment). Pro Series: 4/6 results published, never locked, all 5 prizes unassigned → winners correctly saw "no eligible prize withdrawals", but with zero explanation anywhere.
  2. Latent bug: tournaments created via the admin form keep prizes ONLY in prizeConfig JSON — the lock route iterated db.prize rows, of which Weekend Clash / Community Cup / any new tournament had ZERO → locking would have set resultsLocked but never assigned winners → no withdrawal form EVER. The Prizes tab rendered config-derived pseudo-rows with a toast pointing to a "save configuration" action that did not exist.
  3. UX gaps: no admin guidance that locking is the step that opens payouts; winners in provisional top-3 saw only a generic empty state; the lock notification to teams was generic — nothing told winners "you won, withdraw your prize".
- Fix 1 — lock route (src/app/api/tournaments/[id]/lock/route.ts): auto-materializes Prize rows from prizeConfig when the Prize table is empty (defense-in-depth vs the latent bug); after assignment re-reads prizes (in-memory list was stale — caught by my own E2E: winner notifications initially all-generic); computes podium prize money per team (1st/2nd/3rd only, MVP/kill excluded); podium captains get a dedicated "You finished {1st/2nd/3rd} — prize money available" notification (amount + link /dashboard/withdraw), non-winners keep the generic lock notice; audit log now records full podium + withdrawalOpenForPodium.
- Fix 2 — GET /api/me/withdrawals + src/lib/withdrawals.ts: new getPendingPodium(teamId) — provisional top-3 standings in unlocked ONGOING/COMPLETED tournaments (position, provisional amount from Prize rows with prizeConfig fallback, matches played/planned); returned as `pending` alongside `eligible`.
- Fix 3 — dashboard/withdraw.tsx: amber "Provisional podium — awaiting official results" panel (replaces the bare empty state when applicable; also rendered below eligible cards): medal, tournament, "Currently {position} · X/Y matches played · live", provisional amount, explainer that the form appears automatically once the admin locks.
- Fix 4 — control-center.tsx: finalization guidance banner when results published but not locked ("N of M match results published … click Lock Final Results to publish the official final results — assigns 1st/2nd/3rd-place winners, notifies them, opens the withdrawal form"; primary-accent when all results in, amber note when Prize rows missing); Prizes tab gains a "Create prize records" button that materializes Prize rows from prizeConfig via the existing PUT /prizes API; lock dialog + success toast now say winners are notified and withdrawal opens.
- Ops: materialized Weekend Clash's 3 prize rows via the new button in the browser (real-data fix of the latent bug).

Stage Summary:
- E2E script scripts/test-withdrawal-flow.ts (36/36 passed): temp tournament created in the exact bug condition (prizeConfig only, NO Prize rows, 4 approved teams, published results, unlocked) → captain saw provisional 1st ৳8,000 + no form → API lock → prizes auto-created + winners assigned from standings (Alpha/Bravo/Delta) + 3 winner-specific notifications (amount, link) + 1 generic for Echo → captain eligible row NOT_SUBMITTED → submit 201 → duplicate 409 → admin list + APPROVE + MARK_PAID + Prize ledger PAID + paid confirmation notification → Pro Series provisional regression intact → full test-data cleanup verified
- Browser E2E: admin banner on Pro Series ("4 of 6 match results published…" + Lock Final Results guidance); Prizes tab warning + Create prize records button verified live on Weekend Clash; captain dashboard shows "Provisional podium — awaiting official results / Currently 1st Place · 4/6 matches played · live / ৳12,000 (provisional)"
- Mobile 390px: scrollWidth == clientWidth (no overflow); VLM QA: captain panel 10/10, admin banner 10/10, mobile 9.5/10; console clean
- ESLint full project: 0 errors 0 warnings
- Behavior for the user's report: publishing match results alone still does NOT open withdrawals (by design — eligibility must come from officially finalized results); the missing "Lock Final Results" step is now guided, its side effects automated, and its outcome actively communicated to winners
