# CourseCollab — Native Expo app

Fully native React Native app (no WebView). Calls the CourseCollab Next.js API directly.

**Module UI design:** see [`docs/ios-native-module-design.md`](./docs/ios-native-module-design.md) (native structure + modern CourseCollab accents). Tokens: `NATIVE`, `SYSTEM`, `MODERN` in `src/constants/faculty-native-theme.ts`. Cursor loads the guide via `.cursor/rules/ios-native-module-design.mdc`.

## Quick start

```bash
cd ~/Downloads/course-collab-mobile/expo
npm install --legacy-peer-deps
npx expo start
```

### Expo Go on your phone (SDK 57)

The project targets **Expo SDK 57** to match the App Store **Expo Go** app.

```bash
cd expo
npm run start:go
```

Scan the QR code with **Expo Go** (same Wi‑Fi as your Mac). Or open manually:

```bash
npm run dev:ip   # prints current LAN URLs
```

Example (your IP will differ):

- Metro: `http://10.32.182.158:8081`
- Link: `exp://10.32.182.158:8081`

**Expo Go limitations** (native dev build still required for full QA):

- No Stripe native checkout (membership uses web fallback messaging)
- No in-app PDF viewer (`react-native-pdf`) — WebView fallback
- No `@react-native-cookies/cookies` jar — fetch cookie header fallback
- Speech recognition / some native-only modules degrade gracefully

For Liquid Glass, Stripe, PDF, and App Store parity, use `npx expo run:ios` (dev client) instead of Expo Go.

## iOS native look (Liquid Glass + system chrome)

For the full native iOS experience — including **Liquid Glass** on top bars and sheets — use a **development build** on **iOS 26+** (simulator or device):

```bash
cd expo
npm install --legacy-peer-deps
cd ios && pod install && cd ..
npx expo run:ios --device "iPhone 17 Pro"
```

### Packages that power native iOS chrome

| Package | Role |
|---------|------|
| `expo-glass-effect` | Native Liquid Glass (`GlassView`) on iOS 26+ chrome |
| `expo-blur` | Frosted blur fallback on older iOS |
| `expo-system-ui` | Root view background + system UI style sync |
| `react-native-screens` | Native stack transitions (via Expo Router) |
| `react-native-safe-area-context` | Safe area insets for bars and sheets |
| `react-native-gesture-handler` | Native back-swipe and sheet gestures |
| `react-native-reanimated` | Drawer / theme transition animations |

Chrome is implemented in `src/components/theme/GlassSurface.tsx` with automatic fallback:

**Liquid Glass (iOS 26+)** → **expo-blur** → **translucent solid fill**

### In-app settings

1. **Settings → Appearance → Liquid Glass** (or Frost / Obsidian Glass) — enables glass chrome materials.
2. **Appearance mode: System** — follows iOS light/dark (requires `UIUserInterfaceStyle: Automatic` in the native build).
3. Ensure **Settings → Accessibility → Display → Reduce Transparency** is **off** on the device/simulator.

### Configuration notes

- `app.json` sets `userInterfaceStyle: automatic` and includes the `expo-system-ui` config plugin.
- Do **not** set `UIDesignRequiresCompatibility: true` in Info.plist — that opts the app out of Liquid Glass.
- Rebuild the iOS app after adding or updating native modules (`pod install` + `expo run:ios`).

**API URL**

- The app always uses production: `https://coursecollab.vercel.app`

**Capacitor vs Expo in this repo**

| | Capacitor (root) | Expo (`/expo`) |
|---|---|---|
| Purpose | App Store / Play Store builds | Native RN development |
| UI | WebView shell | Native screens + API |
