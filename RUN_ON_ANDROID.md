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
- [ ] **Android Studio** — https://developer.android.com/studio . During the setup wizard, let it install:
  - Android SDK
  - an **SDK Platform** (API level **34** or **35**)
  - Android SDK Platform-Tools + Emulator
  - (Java 17 is bundled — no separate install.)
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

# one-time: copy the untracked env file from the WSL clone
copy \\wsl.localhost\Ubuntu\home\mbmk92\DEV\bondeal_app\bon-deal-rn\.env.local .env.local

npm install                            # install dependencies
npx expo install expo-build-properties # SDK-matched version of the cleartext-HTTP plugin
npm run prebuild:clean                 # generate the native android/ project (applies all config plugins)
```

- [ ] `npm install` finishes without a fatal error.
- [ ] `npx expo install expo-build-properties` adds the package.
- [ ] `npm run prebuild:clean` creates an `android/` folder.

> **OneDrive note:** with the repo cloned at `C:\DEV` (outside OneDrive), no
> sync-pausing is needed. Don't build from the old OneDrive copy.

---

## 3. Run the app

1. [ ] **Start the emulator** (Android Studio → Device Manager → ▶) and wait until the Android home screen is showing.
2. [ ] **Make sure the backend is running.** It runs in Docker under WSL. In a WSL terminal: `cd bon-deal-fastapi && docker compose up -d` (or it may already be up).
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

The app is configured to reach the backend at **`http://10.0.2.2:8000`**
(`10.0.2.2` is how the emulator addresses your PC's `localhost`).

- [ ] **Confirm the backend is reachable from Windows** (PowerShell):

  ```powershell
  curl http://localhost:8000/
  ```
  Expected: `{"message":"Marketplace API"}`.

- If that works, the emulator's `10.0.2.2:8000` will reach it too.
- **If it does NOT work** (WSL/Docker host-networking hiccup), use the live prod
  backend instead — edit `.env.local`:

  ```
  API_BASE_URL=http://150.230.114.9:8000
  ```
  Then rebuild (`npm run android:local`). This backend is reachable from anywhere
  and uses the same database.

> After changing `.env.local` you must **rebuild** (the value is read at build
> time, not runtime).

---

## 5. Enable the wired flows (login → chat / offers)

Out of the box you can browse the (mock) UI. To test the **real** authenticated
flows (login, chat, offers, notifications), two things are needed:

### 5a. Backend Firebase Admin key — *hand this to Milandu's assistant (me)*
The backend endpoint that turns a Firebase login into a backend session
(`POST /auth/firebase`) is currently **switched off** (returns 503) because the
server has no Firebase Admin key yet.

- [ ] **Firebase Console → ⚙ Project settings → Service accounts → Generate new private key** → download the JSON.
- [ ] Send me that JSON; I'll mount it into the backend, set `FIREBASE_CREDENTIALS_PATH`, and restart. After that, login works end-to-end.

### 5b. A Firebase test phone number — *you*
So you don't have to fight real SMS + SHA-1 registration on the emulator:

- [ ] **Firebase Console → Authentication → Sign-in method → Phone** → make sure it's **Enabled**.
- [ ] Scroll to **Phone numbers for testing** → add e.g. `+241 06 00 00 00` with verification code `123456`.
- [ ] In the app's login screen, enter that number; when asked for the code, enter `123456`. No real SMS is sent.

---

## 6. What works today vs. what's still mock

| Area | State |
|---|---|
| Home feed, Search, Post-item, Profile, Favorites | **Mock data** — render only, not wired to the backend yet (Milestone 3 in the audit plan) |
| Login / OTP (Firebase) | Wired — works once 5a + 5b are done |
| Chat, Offers/Negotiation, Notifications | **Wired** to the backend — work once 5a is done |
| Item details | Wired — opens with a real post id (e.g. from a chat/offer); from the mock home feed it uses a mock id |

So a meaningful end-to-end test is: **login (test number) → make/receive an offer → chat**, not the browse/sell screens.

---

## 7. Troubleshooting

- **`npm run android:local` says "No connected devices"** → the emulator isn't running. Start it in Android Studio first, confirm with `adb devices` (should list an `emulator-5554  device`).
- **Build fails on `expo-build-properties` "cannot find module"** → you skipped `npx expo install expo-build-properties` before `prebuild:clean`. Run it, then `npm run prebuild:clean` again.
- **App loads but every backend call fails / "Network request failed"** → (a) backend not running, (b) `curl http://localhost:8000/` fails from Windows → use the prod URL fallback in §4, or in PowerShell run `adb reverse tcp:8000 tcp:8000` and set `API_BASE_URL=http://localhost:8000`. Rebuild after any `.env.local` change.
- **Login OTP screen works but "login" then does nothing / 503** → that's the backend Firebase Admin key (§5a) not yet installed.
- **Gradle/Metro extremely slow or files locked** → OneDrive is syncing the build output. Pause OneDrive (§2 warning).
- **Emulator has no Play Store / Firebase auth errors about Google Play services** → your AVD used a non-Play image. Recreate the AVD with a "Google Play" system image (§1).
- **Metro stuck / stale cache** → stop it (Ctrl-C) and run `npm run start:local -- --clear`.

---

## Command cheat-sheet

```powershell
# one-time
npm install
npx expo install expo-build-properties
npm run prebuild:clean

# every run (emulator must be booted first)
npm run android:local

# useful
adb devices                     # list emulators/devices
adb reverse tcp:8000 tcp:8000   # alt way to expose the host backend as localhost:8000
npm run start:local -- --clear  # restart Metro with a clean cache
```
