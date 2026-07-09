# UniTrack — Project Analysis Report

> **Generated:** 2026-07-09 | **Analyst:** Antigravity AI
> **Codebase:** `/home/sawon/unitrack`

---

## 1. Project Overview

**UniTrack** is a university-focused, social-media-style **issue tracking and discussion platform**. It allows students, teachers, and administrators to:

- Submit campus issues, academic problems, suggestions, and lost/found items
- Track the resolution lifecycle of issues (New → Acknowledged → Investigating → Dev In-Progress → Resolved)
- React to posts (like, dislike, repost, comment) with real-time updates
- Search issues by keyword, user, category, tag, or status
- Receive real-time in-app and browser push notifications

The UX is inspired by Twitter/X — a dark-mode mobile-first SPA with a floating bottom navigation bar.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **UI Framework** | React | 19.0.0 |
| **Language** | TypeScript | ~5.8.2 |
| **Build Tool** | Vite | 6.2.0 |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | 4.1.14 |
| **Animations** | Framer Motion + Motion | 12.x |
| **Backend / DB** | Firebase (Firestore, Auth, Storage) | 12.11.0 |
| **Image Hosting** | Cloudinary (server + client unsigned) | 2.9.0 |
| **Dev Server** | Express + Vite middleware | 4.22.1 |
| **Full-text Search** | Fuse.js (client-side fuzzy) | 7.1.0 |
| **Markdown** | react-markdown + remark-gfm | 10.1.0 |
| **Toast** | Sonner | 2.0.7 |
| **Icons** | Lucide React | 0.546.0 |
| **Date Formatting** | date-fns | 4.1.0 |
| **PWA** | vite-plugin-pwa | 1.3.0 |
| **Utility** | clsx + tailwind-merge | — |
| **AI SDK** | @google/genai | 1.29.0 (**imported but unused**) |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client — React SPA                          │
│                                                                 │
│  main.tsx ──► App.tsx (1455 lines · God Component)             │
│                    │                                            │
│         ┌──────────┼──────────────────────────────┐            │
│         │          │          │          │         │            │
│     Dashboard  Search    PostDetail  Create    Analytics        │
│         │          │          │          │         │            │
│         └──────────┴────► PostCard ◄────┴─────────┘            │
│                                                                 │
│  Custom Hook:   useScrollDirection (×6 instances on window!)   │
│  Services:      offlineService (localStorage queue)            │
│  Utils:         cloudinaryUtils · imageUtils · firestoreError  │
│  Lib:           sound.ts (Web Audio API)                        │
└─────────────────────────────────────────────────────────────────┘
          │ real-time onSnapshot          │ POST /api/upload
          ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Firebase            │      │  server.ts           │
│  ├─ Firestore        │      │  Express + Vite      │
│  │   /posts          │      │  (dev server)        │
│  │   /comments       │      └──────────┬───────────┘
│  │   /users          │                 │ Cloudinary SDK
│  │   /notifications  │                 ▼
│  ├─ Auth (Email/PIN) │      ┌──────────────────────┐
│  └─ Storage (unused) │      │  Cloudinary CDN      │
└──────────────────────┘      │  (image hosting)     │
                              └──────────────────────┘
```

**Data flow:**
```
User action → App.tsx handler → Optimistic UI update → Firestore write
                                                              │
                                                    onSnapshot fires
                                                              │
                                               State sync + notification
                                               created → target user's
                                               listener → Toast + sound
```

---

## 4. Folder Structure & File Purpose

```
unitrack/
├── firebase-applet-config.json   ⚠️  Firebase SDK config COMMITTED (contains real keys)
├── firebase-blueprint.json           Schema docs — OUTDATED vs. actual types.ts
├── firestore.rules                   Firestore security rules (well-structured)
├── server.ts                     ⚠️  Express server — Cloudinary secrets hardcoded as defaults
├── vite.config.ts                    Vite + PWA + Tailwind plugin config
├── tsconfig.json
├── package.json                  ⚠️  name="react-example", vite duplicated in deps+devDeps
├── .env.example                  🔴  Contains REAL Cloudinary API key + secret
├── scripts/
│   └── updateRoles.ts                One-off regex-replacement script (dead code)
├── public/
│   └── icon.svg                  ⚠️  Only SVG; no 192×192 or 512×512 PNG (Notification API refs missing PNG)
└── src/
    ├── App.tsx                   ⚠️  1455 lines — ALL state, subscriptions, handlers in one file
    ├── main.tsx                      ReactDOM entry point
    ├── types.ts                      Shared TypeScript interfaces (well-defined)
    ├── firebase.ts                   Firebase initialization (experimentalForceLongPolling enabled)
    ├── data.ts                   ❌  Dead code — empty arrays, unused exports
    ├── utils.ts                      cn() utility only (clsx + tw-merge)
    ├── index.css                     Global CSS + Tailwind directives
    ├── vite-env.d.ts
    ├── components/               18 UI components
    │   ├── App-level:  AuthModal, ConfirmModal, UserListModal
    │   ├── Layout:     Header, Avatar, Skeleton, SkeletonPost
    │   ├── Screens:    Dashboard, SearchScreen, PostDetail, CreatePostScreen,
    │   │               AnalyticsDashboard, NotificationsScreen, ProfileScreen
    │   ├── Modals:     ImageModal, StatusTrackerModal ❌ (never mounted in App.tsx)
    │   └── Admin:      AdminPanel
    ├── hooks/
    │   └── useScrollDirection.ts     Single custom hook (instantiated ×6)
    ├── lib/
    │   └── sound.ts                  Web Audio API synthesized notification beep
    ├── services/
    │   └── offlineService.ts         localStorage offline action queue
    └── utils/
        ├── cloudinaryUtils.ts        Client-side unsigned Cloudinary upload
        ├── imageUtils.ts             Canvas-based image compression
        ├── firestoreErrorHandler.ts  Structured error logging
        └── colors.ts             ❌  Dead code — never imported
```

---

## 5. Features Implemented

### Core Content
- ✅ Create posts: title, Markdown description, category, tags, images
- ✅ Anonymous posting (stable `anon_<id>` handle)
- ✅ Post draft auto-save to `localStorage`
- ✅ Post live preview mode
- ✅ Image compression via Canvas API before upload
- ✅ Multi-image support (displays 2, shows "+N" overflow)

### Social Engagement
- ✅ Like / Dislike (mutual exclusion, optimistic UI)
- ✅ Repost (toggle)
- ✅ Nested threaded comments (depth ≤ 3)
- ✅ Comment like / dislike
- ✅ View tracking (per-user array + anonymous via `localStorage`)
- ✅ Native Share API with clipboard fallback
- ✅ Reposter list modal

### Issue Tracking (Core USP)
- ✅ Status lifecycle: New → Acknowledged → Investigating → Dev In-Progress → Resolved → Reopened
- ✅ Visual step-progress tracker with animated line
- ✅ Clickable status history (message + timestamp + updater)
- ✅ Inline admin/teacher status update panel
- ✅ Role-based permissions on status transitions

### Search & Discovery
- ✅ Fuse.js fuzzy search with engagement-score boosting
- ✅ Query prefixes: `@user`, `#tag`, `status:`, `category:`
- ✅ @-mention autocomplete dropdown
- ✅ Track Status view (posts user has interacted with)
- ✅ Tag/status/category click → search navigation

### Navigation & UX
- ✅ Floating bottom nav (auto-hides on scroll down)
- ✅ Scroll position restoration when returning to feed
- ✅ Hash-based deep linking (`#post-<id>`)
- ✅ Pull-to-refresh gesture (simulated — does not refetch)
- ✅ Infinite scroll with `IntersectionObserver`
- ✅ Pinned posts horizontal auto-scrolling carousel
- ✅ Skeleton loading states
- ✅ Framer Motion screen transitions

### Auth & Roles
- ✅ Email/Password Firebase Auth
- ✅ 4-level role system: `user | student | teacher | administration`
- ✅ Role application flow (user applies → admin approves)
- ✅ Admin panel (user list + role selector)
- ✅ Verified badges: blue (admin), green (teacher)
- ✅ Account deactivation detection → force sign-out

### Notifications
- ✅ Real-time Sonner toasts + browser Push Notifications
- ✅ Web Audio API notification sound
- ✅ Types: `comment`, `status_update`, `pin`, `announcement`, `reaction`, `trending`
- ✅ Mark all as read
- ✅ Deep-link to post + highlight specific comment

### PWA & Offline
- ✅ PWA manifest + service worker
- ✅ Firestore persistent offline cache (multi-tab)
- ✅ Offline action queue for posts, comments, reactions
- ✅ Online/offline banner + install prompt

### Analytics
- ✅ Summary stats: Total Posts, Views, Reach, Interactions
- ✅ Top 20 posts sortable by 6 criteria

---

## 6. Missing / Incomplete Features

| Feature | Status | Notes |
|---|---|---|
| **Post editing** | ❌ Missing | No edit flow for title/description/tags |
| **Post pinning UI** | ⚠️ Partial | `isPinned` field + carousel exists; no toggle UI |
| **Username change** | ⚠️ Partial | `usernameChanged` flag tracked; no UI |
| **Account Preferences** | ❌ Stub | Button in ProfileScreen does nothing |
| **User profile pages** | ❌ Missing | Clicking username/avatar has no navigation |
| **Comment editing/deletion** | ❌ Missing | Users can't edit or delete their own comments |
| **Password reset** | ❌ Missing | No "Forgot PIN" in AuthModal |
| **`@google/genai` integration** | ❌ Unused | Package installed, GEMINI_API_KEY in env, zero code using it |
| **Firebase Storage** | ❌ Unused | Imported + initialized; Cloudinary used instead |
| **`colors.ts`** | ❌ Dead code | Never imported anywhere |
| **`data.ts`** | ❌ Dead code | Empty arrays, not used |
| **`StatusTrackerModal.tsx`** | ❌ Not mounted | Never rendered in App.tsx |
| **PWA PNG icons** | ⚠️ Missing | Notification API refs `/icon-192x192.png` which doesn't exist |
| **Pull-to-refresh** | ⚠️ Fake | 1.5s timeout spinner; no actual data refetch |
| **University email validation** | ⚠️ Wrong | AuthModal enforces `@gmail.com` only |
| **Notification spam prevention** | ❌ Missing | Any auth user can create notifs for any user |
| **Rate limiting on uploads** | ❌ Missing | `/api/upload` has no rate limit |

---

## 7. Bugs

### 🔴 Critical

| # | Location | Description |
|---|---|---|
| B-1 | `server.ts` L11–13 | **Cloudinary secrets hardcoded as fallback values** in source code. Anyone with repo access can use your Cloudinary account. |
| B-2 | `.env.example` L19–20 | **Real Cloudinary API key + secret committed** to the example env file. |
| B-3 | `App.tsx` L215 | **`alert()` used for account deactivation** — blocking browser dialog. Should use `ConfirmModal`. |
| B-4 | `App.tsx` L898, `PostDetail.tsx` L1291 | **`onDelete` prop never passed to `PostDetail`** from `App.tsx`. The delete button inside PostDetail never appears for admins. |

### 🟡 Medium

| # | Location | Description |
|---|---|---|
| B-5 | `Dashboard.tsx` L82–94 | **Pull-to-refresh is fake** — shows a spinner for 1.5s then hides. Misleading UX. |
| B-6 | `App.tsx` L268–297 | **Posts listener starts before auth is ready** — can trigger rule mismatch errors on slow auth. |
| B-7 | `AuthModal.tsx` L28 | **`@gmail.com` only validation** — blocks university email addresses. |
| B-8 | `offlineService.ts` L20 | **Action IDs use `Math.random()`** — collision-prone; use `crypto.randomUUID()`. |
| B-9 | `App.tsx` L398–404 | **`syncOfflineActions` calls `handleLike/handleDislike/handleRepost`** which call `handleSignIn()` if user is null — can open auth modal unexpectedly on reconnect. |
| B-10 | `PostDetail.tsx` L685 | **Comment input placeholder is identical** for normal and reply mode — copy-paste bug. |

### 🟢 Minor

| # | Location | Description |
|---|---|---|
| B-11 | `PostDetail.tsx` L644–646 | **BarChart2 button has no onClick** — dead button in the post action bar. |
| B-12 | `Dashboard.tsx` L166 | **Single pinned post is needlessly duplicated** for the infinite-scroll effect. |
| B-13 | `App.tsx` L990–998 | **"Track" tab filter logic diverges** from `SearchScreen`'s `trackPosts` logic. |

---

## 8. Security Issues

### 🔴 Critical

| # | Issue | Location |
|---|---|---|
| S-1 | **Cloudinary API Secret in source code** | `server.ts` L13, `.env.example` L20 — **rotate these keys immediately** |
| S-2 | **Firebase config committed to repo** | `firebase-applet-config.json` — enables quota exhaustion / targeted abuse |

### 🟡 Medium

| # | Issue | Location |
|---|---|---|
| S-3 | **Any authenticated user can create notifications for any user** | `firestore.rules` L82 — no ownership check or field validation on `create` |
| S-4 | **Admin email hardcoded in Firestore rules** | `firestore.rules` L21 — `"info.vaijan@gmail.com"` is a permanent backdoor |
| S-5 | **No rate limiting on `/api/upload`** | `server.ts` — open to unlimited Cloudinary uploads |
| S-6 | **`viewedBy[]` + `likedBy[]` grow unboundedly** on post documents | Firestore doc size limit is 1MB; a viral post will hit this |

### 🟢 Minor

| # | Issue | Location |
|---|---|---|
| S-7 | **`confirm()` for destructive actions** | Dashboard, SearchScreen, ProfileScreen — phishable; use `ConfirmModal` |
| S-8 | **8-digit numeric PIN** is weak authentication | `AuthModal.tsx` — only 10^8 combinations |

---

## 9. Code Smells & Technical Debt

| # | Smell | Location |
|---|---|---|
| CS-1 | **God Component** — 1455-line `App.tsx` holds all state, subscriptions, handlers, routing | `App.tsx` |
| CS-2 | **Duplicated Markdown link renderer** — identical 40-line block defined twice | `PostDetail.tsx` L156 & L290 |
| CS-3 | **Duplicated `statusColors` map** — defined in `PostDetail.tsx` and `SearchScreen.tsx` | Both files |
| CS-4 | **Heavy `any` usage** — `deferredPrompt: any`, `updates: any`, `selectedHistory: any` | App.tsx, PostDetail.tsx |
| CS-5 | **`firebase-blueprint.json` is stale** — Role shows 2 values (should be 4), Category shows 2 (should be 6), `repostedBy` typed as `string` (should be `string[]`) | `firebase-blueprint.json` |
| CS-6 | **Sequential `updateDoc` loops** — `handleMarkAllRead` and `handleUpdateStatus` make N separate writes | `App.tsx` L1031, L947 — use `WriteBatch` |
| CS-7 | **`useScrollDirection` instantiated ×6** — 6 separate RAF-throttled `window` scroll listeners | App.tsx, Dashboard, Search, Analytics, PostDetail, Profile |
| CS-8 | **`processFiles` uses `forEach` with `async`** — incorrect error propagation | `CreatePostScreen.tsx` L101 |
| CS-9 | **`package.json` name is `"react-example"`** | `package.json` L2 |
| CS-10 | **`vite` in both `dependencies` and `devDependencies`** | `package.json` L35, L44 |
| CS-11 | **`framer-motion` and `motion` both installed** — they are the same library (motion is the standalone version) | `package.json` L24, L27 |
| CS-12 | **Dead files**: `data.ts`, `colors.ts`, `StatusTrackerModal.tsx` (never rendered), `scripts/updateRoles.ts` | Various |

---

## 10. Performance Bottlenecks

| # | Issue | Location | Impact |
|---|---|---|---|
| P-1 | **500 users loaded in real-time** on auth for all logged-in users | `App.tsx` L247 | Not scalable; high memory |
| P-2 | **`viewedBy[]` / `likedBy[]` as document arrays** | Firestore schema | 1MB doc limit risk at scale |
| P-3 | **`experimentalForceLongPolling: true`** | `firebase.ts` L10 | Disables WebSockets; slower sync |
| P-4 | **6 simultaneous `window` scroll listeners** | Multiple components | Unnecessary RAF overhead |
| P-5 | **Fuse.js re-indexes full post list on every search** | `SearchScreen.tsx` | Fine at 100 posts; degrades at scale |
| P-6 | **`localStorage` caches full post objects** including large `viewedBy[]` arrays | `App.tsx` L284 | localStorage quota risk |

---

## 11. Recommended Improvements (Prioritized)

### 🔴 Phase 1 — Security (Do immediately)
1. **Rotate Cloudinary keys.** Remove hardcoded secrets from `server.ts` and `.env.example`.
2. **Move Firebase config** to `VITE_` environment variables; remove `firebase-applet-config.json` from repo.
3. **Tighten notification Firestore rule** — add `userId` ownership check + allowed `type` enum.
4. **Add `express-rate-limit`** to `/api/upload`.
5. **Replace all `confirm()` dialogs** with the existing `ConfirmModal`.

### 🟡 Phase 2 — Refactor
6. **Split `App.tsx`** into custom hooks: `usePostActions`, `useAuthState`, `useFeedSubscription`, `useNotifications`, `useComments`.
7. **Extract shared constants** — `statusColors`, `STATUS_ORDER` → `src/constants.ts`.
8. **Extract `<MarkdownContent>`** shared component (used by PostDetail × 2 and PostCard).
9. **Replace sequential `updateDoc` loops** with Firestore `WriteBatch`.
10. **Remove dead code**: `data.ts`, `colors.ts`, `StatusTrackerModal.tsx`, `scripts/updateRoles.ts`.
11. **Fix `package.json`**: name, remove duplicate vite, pick one of `framer-motion`/`motion`.

### 🟢 Phase 3 — Feature Completeness
12. **Post editing** — allow owners to edit title, description, tags within 24h.
13. **Comment deletion** — allow comment owners to delete their own comments.
14. **Post pinning UI** — admin toggle in the post action menu.
15. **Username change** — one-time change using the `usernameChanged` flag.
16. **Password reset** — "Forgot PIN" link in `AuthModal`.
17. **User profile pages** — clicking a username navigates to a filtered post view.
18. **Gemini AI integration** — tag suggestion, post summary, or status update drafting.

### ⚪ Phase 4 — Performance & Scale
19. **Remove `experimentalForceLongPolling`** unless a specific environment requires it.
20. **Paginate users query** — load users on demand rather than all 500 upfront.
21. **Lift `useScrollDirection`** to a single context provider.
22. **Move `viewedBy[]`/`likedBy[]` to subcollections** or use sharded counters.
23. **Generate proper PWA icons** (192×192, 512×512 PNG).

---

## 12. Development Roadmap

```
Phase 1 — Security (1–2 days)
  [x] Rotate Cloudinary secrets
  [ ] Firebase config → env vars
  [ ] Tighten notification rules
  [ ] Rate-limit /api/upload
  [ ] Replace confirm() with ConfirmModal

Phase 2 — Refactor (3–5 days)
  [ ] Split App.tsx into hooks
  [ ] Extract shared constants & components
  [ ] WriteBatch for bulk writes
  [ ] Remove dead code

Phase 3 — Features (1–2 weeks)
  [ ] Post editing
  [ ] Comment deletion
  [ ] Post pinning UI
  [ ] Username change
  [ ] Password reset
  [ ] User profile pages
  [ ] Gemini AI features

Phase 4 — Scale (1 week)
  [ ] Remove long-polling
  [ ] Paginate users
  [ ] Scroll context
  [ ] Subcollection reactions
  [ ] PWA icons
  [ ] E2E tests (Playwright)
```

---

## 13. Scorecard

| Dimension | Score | Notes |
|---|---|---|
| **Feature Completeness** | 7/10 | Core loop solid; editing, profiles, AI missing |
| **Code Quality** | 4/10 | God component, duplicated code, heavy `any` |
| **Security** | 3/10 | Leaked secrets, weak notification rules |
| **Performance** | 6/10 | Good optimistic UI; scalability concerns |
| **UX / Design** | 8/10 | Mobile-first, dark mode, animated — well executed |
| **Documentation** | 4/10 | Blueprint stale; no JSDoc; no tests |
| **Testing** | 0/10 | Zero test files exist |

---

*No source code was modified during this analysis.*
