# Running BonDeal Mobile on an Android Emulator (Windows)

A step-by-step guide to build and run the `bon-deal-rn` app on a local Android
emulator. Follow the sections in order. Checkboxes mark the things **you** do.

> **Why not Expo Go?** BonDeal uses native modules (`@react-native-firebase/*`,
> `expo-maps`), which the plain Expo Go app cannot load. We build a real *dev
> build* instead. It's a one-time extra step; after that, JS changes hot-reload
> normally.

> **Why run from Windows, not WSL?** The emulator, `adb`, and Gradle all run on
> Windows, and driving a Windows emulator from WSL is painful — so run every
> command below in **Windows PowerShell**, against a Windows-side clone of the
> repo at `C:\DEV\bondeal_app\bon-deal-rn` (**outside OneDrive** — OneDrive
> locks files mid-build). Create it once:
>
> ```powershell
> mkdir C:\DEV\bondeal_app; cd C:\DEV\bondeal_app
> git clone https://github.com/albanlandry/bon-deal-rn.git
> ```
>
> (The WSL-side copy at `~/DEV/bondeal_app/bon-deal-rn` is where backend-adjacent
> edits happen; the two sync through git push/pull.)

---

## 1. One-time installs (Windows)

- [ ] **Node.js 20 LTS** — https://nodejs.org (Windows installer). Verify: `node -v` → `v20.x`.
- [ ] **Allow npm to run in PowerShell.** By default PowerShell blocks `.ps1`
  scripts, and npm ships as one — so `npm install` fails with *"npm.ps1 cannot be
  loaded because running scripts is disabled on this system."* Fix once (no admin
  needed, scoped to your user):

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  Verify: `Get-ExecutionPolicy -List` shows `CurrentUser  RemoteSigned`.
  (Alternative if you'd rather not change it: prefix every call with `.cmd` —
  `npm.cmd install`, `npm.cmd run android:local`.)
- [ ] **Android Studio** — https://developer.android.com/studio . During the setup wizard, let it install:
  - Android SDK
  - an **SDK Platform** (API level **34** or **35**)
  - Android SDK Platform-Tools + Emulator
- [ ] **Point `JAVA_HOME` at Android Studio's bundled JDK.** A JDK ships *inside*
  Android Studio (JetBrains Runtime 21) — no separate install — but Gradle can't
  find it on its own, so `npm run android:local` fails with *"JAVA_HOME is not set
  and no 'java' command could be found in your PATH"* (exit code 9009). Set it
  once (User scope, no admin):

  ```powershell
  [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
  ```
  Reopen PowerShell, then verify: `echo $Env:JAVA_HOME` and
  `& "$Env:JAVA_HOME\bin\java.exe" -version` → `openjdk version "21.x"`.
  (To use it in the *current* window without reopening:
  `$Env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`.)
  Older Android Studio installs use `\jre` instead of `\jbr` — check which exists.
- [ ] **Create a Virtual Device (AVD):** Android Studio → **More Actions → Virtual Device Manager → Create Device**.
  - Pick e.g. **Pixel 7**.
  - For the system image, **choose one with the Play Store icon** (a "Google Play" image). ⚠️ This matters — Firebase phone-auth needs Google Play services.
  - Finish, then press **▶** to boot the emulator once (confirm it starts).
- [ ] **Confirm environment variables** (PowerShell): `echo $Env:ANDROID_HOME`
  - Expected: `C:\Users\user\AppData\Local\Android\Sdk`. If empty, set it: System Properties → Environment Variables → add `ANDROID_HOME` pointing there, and add `%ANDROID_HOME%\platform-tools` to `Path`. Reopen PowerShell.
  - Verify tooling: `adb --version` prints a version.

---

## 2. Project setup (one time)

Open **Windows PowerShell** and run:

```powershell
cd C:\DEV\bondeal_app\bon-deal-rn

# .env.local is untracked — create it pointing at the prod backend (see §4)
"API_BASE_URL=http://150.230.114.9:8000" | Out-File -Encoding ascii .env.local

npm install                            # install dependencies
npm run prebuild:clean                 # generate the native android/ project (applies all config plugins)
```

- [ ] `.env.local` exists with the prod `API_BASE_URL`.
- [ ] `npm install` finishes without a fatal error.
- [ ] `npm run prebuild:clean` creates an `android/` folder.

> **OneDrive note:** with the repo cloned at `C:\DEV` (outside OneDrive), no
> sync-pausing is needed. Don't build from the old OneDrive copy.

---

## 3. Run the app

1. [ ] **Start the emulator** (Android Studio → Device Manager → ▶) and wait until the Android home screen is showing.
2. [ ] **Nothing to start** — the app talks to the **prod** backend (§4), which is
   always up. Sanity-check it from PowerShell if you like:
   `curl http://150.230.114.9:8000/` → `{"message":"Marketplace API"}`.

   <details><summary>Only if you switched to the local backend</summary>

   Start it in a WSL terminal. Note this machine has Compose **v1**, so the
   command is hyphenated:

   ```bash
   cd ~/DEV/bondeal_app/bon-deal-fastapi && docker-compose up -d backend
   ```
   (`docker compose ...` with a space needs the v2 plugin, which isn't installed
   here — it fails with `unknown shorthand flag: 'd'`.) Check it's up with
   `docker ps`; it often already is.
   </details>
3. [ ] **Build & launch** (PowerShell, in the project folder):

   ```powershell
   npm run android:local
   ```

   The **first** build takes ~5–15 minutes (Gradle downloads). It compiles the
   app, installs it on the emulator, and starts the Metro bundler. Later runs are
   fast — just `npm run android:local` again, or press `a` in the Metro window.

- [ ] The BonDeal app opens on the emulator.

---

## 4. Connect the app to the backend

**For testing, point at prod.** It's always up, runs the latest code, and shares
the same Supabase database as local. (Login is blocked on *both* backends until a
Firebase key is installed — see §5a.) Set `.env.local` to:

```
API_BASE_URL=http://150.230.114.9:8000
```

Prod is reachable from anywhere and uses the same Supabase database + the latest
code. `curl http://150.230.114.9:8000/` should return `{"message":"Marketplace API"}`.

> After changing `.env.local` you must **rebuild** (`npm run android:local`) — the
> value is read at build time, not runtime.

<details><summary>Advanced: using the local WSL backend instead</summary>

The local backend answers at **`http://10.0.2.2:8000`** (`10.0.2.2` = the
emulator's route to your PC's `localhost`) and hits the same Supabase database.
Useful if you want to install a Firebase key on a backend you fully control
without touching shared prod (§5a). If the emulator can't reach it, run
`adb reverse tcp:8000 tcp:8000` and set `API_BASE_URL=http://localhost:8000`.
Confirm from Windows with `curl http://localhost:8000/`.
</details>

---

## 5. Enable login (Firebase → backend session)

The whole app is now wired to the real backend (see §6). Every screen — browse,
sell, search, favorites, profile — needs you to be **logged in**, which needs the
`POST /auth/firebase` endpoint working.

### 5a. Backend Firebase Admin key — ⚠️ NOT installed yet (blocks login)
`POST /auth/firebase` currently returns **503 "Firebase auth is not configured on
the server"** on **both** the prod and local backends — `FIREBASE_CREDENTIALS_PATH`
is unset in both. Until a key is installed you can reach the login screen and
receive an OTP, but the session exchange fails, so no authenticated screen loads.

Two halves must belong to the **same** Firebase project:
1. **App** — `firebase/configs/google-services.json` (today: project `bon-deal-mvp`,
   package `com.gabtech.bondeal`).
2. **Backend** — a service-account JSON at `FIREBASE_CREDENTIALS_PATH`. The backend
   calls `firebase_admin.verify_id_token()`, which only accepts tokens minted by
   its own project.

To supply it: **Firebase Console → ⚙ Project settings → Service accounts →
Generate new private key** → the downloaded JSON goes on the backend, with
`FIREBASE_CREDENTIALS_PATH` pointing at it, then restart the container.

Both backends run against the **same Supabase database**, so either works for
data; only the Firebase key decides whether login completes.

### 5b. A Firebase test phone number — *you*
So you don't have to fight real SMS + SHA-1 registration on the emulator:

- [ ] **Firebase Console → Authentication → Sign-in method → Phone** → make sure it's **Enabled**.
- [ ] Scroll to **Phone numbers for testing** → add e.g. `+241 06 00 00 00` with verification code `123456`.
- [ ] In the app's login screen, enter that number; when asked for the code, enter `123456`. No real SMS is sent.

---

## 6. What works today

As of 2026-07-05 the mock data is gone — **every screen is wired to the real
backend** (deployed to prod). Once you're logged in (§5, pointed at prod):

| Area | State |
|---|---|
| Login / OTP (Firebase) | **Wired** — works on prod (§5a) once you add a test number (§5b) |
| Home feed | **Wired** — real listings in your city, category chips, infinite scroll, pull-to-refresh |
| Search + results | **Wired** — keyword + category/price/condition filters + sort; item cards tap through |
| Post / edit item, My listings | **Wired** — create (with photo upload), edit, mark sold, delete |
| Favorites, Profile, Edit profile | **Wired** — like/unlike, live stats, avatar upload, profile edit |
| Chat, Offers/Negotiation, Notifications | **Wired** |
| Item details | **Wired** — real post id from any list |
| **AI:** Suggestions IA (photo→draft), Prix conseillé, Boutique Éclair ⚡, Trouve-moi ça (smart search) | **Wired** — all run on Gemini |

A good end-to-end test now: **login → browse the feed → open an item → post an
item (try "Suggestions IA" + "Prix conseillé") → search "un frigo pas cher" via
the ✨ button → favorite something → check your profile.**

---

## 7. Troubleshooting

- **`npm run android:local` says "No connected devices"** → the emulator isn't running. Start it in Android Studio first, confirm with `adb devices` (should list an `emulator-5554  device`).
- **App loads but every backend call fails / "Network request failed"** → (a) backend not running, (b) `curl http://localhost:8000/` fails from Windows → use the prod URL fallback in §4, or in PowerShell run `adb reverse tcp:8000 tcp:8000` and set `API_BASE_URL=http://localhost:8000`. Rebuild after any `.env.local` change.
- **Login OTP screen works but "login" then does nothing / 503** → no Firebase Admin key is installed on the backend yet (§5a). Both prod and local return 503 until one is added.
- **Gradle/Metro extremely slow or files locked** → you're building from the old OneDrive copy. Use the `C:\DEV\bondeal_app\bon-deal-rn` clone (see the note at the top).
- **Emulator has no Play Store / Firebase auth errors about Google Play services** → your AVD used a non-Play image. Recreate the AVD with a "Google Play" system image (§1).
- **Metro stuck / stale cache** → stop it (Ctrl-C) and run `npm run start:local -- --clear`.
- **`JAVA_HOME is not set...` / gradlew exits with code 9009** → `JAVA_HOME` isn't pointing at Android Studio's bundled JDK. See §1.
- **`npm ... cannot be loaded because running scripts is disabled`** → PowerShell execution policy. See §1.

---

## Command cheat-sheet

```powershell
# one-time
npm install
npm run prebuild:clean

# every run (emulator must be booted first)
npm run android:local

# useful
adb devices                     # list emulators/devices
adb reverse tcp:8000 tcp:8000   # alt way to expose the host backend as localhost:8000
npm run start:local -- --clear  # restart Metro with a clean cache
```
