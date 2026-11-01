# BonDeal — project context

Marketplace mobile app (React Native / Expo) for classified listings in French, priced in FCFA. Package name `bondeal`, Android/iOS id `com.gabtech.bondeal`. The backend is a separate FastAPI service; this repo is the client only.

Several markdown docs (`Architecture.md`, `Backend.md`, `backend_api.md`, `FRONTEND_MVP_ROADMAP.md`) describe an earlier design (Node/Express, phone+password JWT, UUID models, mock data). The running app has moved past that. Prefer the code under `app/`, `lib/`, `contexts/`, and `constants/` over those docs.

## Stack

- Expo SDK 54, React Native 0.81, React 19, New Architecture on
- Expo Router (file-based routes in `app/`), typed routes
- TanStack Query for server state (`lib/queryClient.ts`)
- React Native Paper, React Hook Form + Yup, Reanimated
- Firebase (React Native Firebase): phone auth, Cloud Messaging, Crashlytics
- Environments via `APP_ENV` (`local` | `test` | `production`) and `.env.{env}`, loaded in `app.config.js` and read through `utils/config.ts`
- Default API base: `http://localhost:8000`. Production API is HTTPS at `https://bondeal.duckdns.org`. Android cleartext HTTP is allowed only outside production.

Scripts: `npm run start:local|test|prod`, plus matching `android:`, `ios:`, `web:`, and `prebuild:` variants.

## Auth

Firebase is the identity source. `PhoneAuthContext` holds the SMS confirmation during signup/login. `AuthContext` then exchanges the Firebase ID token for a short-lived backend JWT:

1. `POST /auth/firebase` with `{ firebase_id_token }`
2. JWT stored in secure storage (`lib/auth-storage.ts`) and on the API client
3. Profile loaded from `GET /auth/me`

A 401 triggers one shared re-exchange (`exchangeFirebaseToken(true)`), then the original request is retried. There is no backend refresh-token flow on mobile. Push registration happens after a successful `/auth/me`.

`BackendUser` fields: id, username, role, city, quartier, avatar, name, gender, phone, email, date of birth, rating, review count.

## Domain

Listings are **posts**, not the older “products” model. Types live in `constants/types.ts` and mirror FastAPI serializers. IDs are integers.

- **Post** (`BdPost`): title, description, price or free, exchange items, negotiation flag, state, owner, city, categories, pickup quartier/note, condition, age bucket, views/likes/shares/offers, images.
- **States**: `published`, `sold`, `draft`, `reserved`, `unpublished` (`constants/catalog.ts`).
- **Categories** (enum values, French labels): electronics, furniture, appliances, vehicles, fashion, baby_kids, sports, books, tools, other.
- **Condition**: excellent, good, fair, poor. **Age**: lt_6mo, 6mo_2y, 2y_5y, gt_5y.
- **Conversation** is tied to a post, with buyer/seller roles, unread count, and a latest negotiation summary.
- **Chat messages** are text or system events (offer made, counter, accepted, rejected, withdrawn).
- **Negotiation**: pending / accepted / rejected / cancelled, with an offer ladder. Accepting creates a pending transaction and reserves the post.
- **Notifications** reference a conversation and/or negotiation.
- Money is formatted as space-grouped FCFA (`lib/format.ts`). Relative times are French.

## Screens (Expo Router)

Tabs (`app/(tabs)/_layout.tsx`): Menu (`index`), Home, Favoris, Chat, Profile. `two` is hidden.

Stack screens in `app/_layout.tsx`: login, signup, verify-number, set-password, setup-profile, terms, item-details, post-item, chatroom, make-offer (modal), search, search-results, notifications, edit-profile, my-listings, boutique-eclair, favorites, settings, notification-settings, privacy-settings, help-support.

Home uses an infinite query over `GET /posts` with category chips, list/grid, and pull-to-refresh. Cards go through `lib/mapPost.ts`.

## API client

`lib/api.ts` is a small `fetch` wrapper: JSON or `FormData`, Bearer JWT, FastAPI `detail` errors as `ApiError`.

| Module | Role |
| --- | --- |
| `lib/api/posts.ts` | Feed, mine, liked, CRUD, like/unlike, price check |
| `lib/api/conversations.ts` | List, get-or-create by post, messages, mark read |
| `lib/api/negotiations.ts` | Open, counter, accept, reject, Négo-Coach |
| `lib/api/ai.ts` | Image upload, AI draft, price suggestion, Boutique Éclair bulk draft, natural-language search parse |
| `lib/api/notifications.ts` | List, unread count, mark read |
| `lib/api/me.ts` | Profile patch, avatar upload |
| `lib/api/quartiers.ts` | Quartiers for a city |
| `lib/push.ts` | FCM token register/unregister, foreground handler |

AI features (server-side, client calls only):

- **Bon prix ?** — `POST /posts/{id}/price_check` (bonne affaire / prix correct / trop cher)
- **Listing draft** — `POST /posts/ai_draft` from uploaded photo URLs
- **Price suggestion** — `POST /posts/price_suggestion` from comparables
- **Boutique Éclair** — `POST /posts/bulk_draft` (1–3 photos → up to 10 drafts); screen `app/boutique-eclair.tsx`
- **Trouve-moi ça** — `POST /search/parse`
- **Négo-Coach** — `POST /negotiations/{id}/coach` (ephemeral; not stored)

Images are uploaded to storage via `POST /upload`, then public URLs are sent to the AI endpoints.

## Layout of the repo

```
app/                  routes and screens
components/           atoms, molecules (ProductCard, OTPInput), splash
contexts/             AuthContext, PhoneAuthContext
constants/            types, catalog enums, Colors
lib/                  api client, query helpers, push, formatting
utils/                config.ts, theme.js
firebase/configs/     google-services.json
plugins/              optional Expo config plugin
```

UI copy is French. Root layout wraps the tree in QueryClient, phone auth, auth, navigation theme, and a toast.
