# CourseCollab — Native Expo app

Fully native React Native app (no WebView). Calls the CourseCollab Next.js API directly.

**Module UI design:** see [`docs/ios-native-module-design.md`](./docs/ios-native-module-design.md) (native structure + modern CourseCollab accents). Tokens: `NATIVE`, `SYSTEM`, `MODERN` in `src/constants/faculty-native-theme.ts`. Cursor loads the guide via `.cursor/rules/ios-native-module-design.mdc`.

## Quick start

```bash
cd ~/Downloads/course-collab-mobile/expo
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone for JS-only iteration.

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

- Production default: `https://coursecollab.vercel.app`
- Local dev: set `extra.appUrl` in `app.json` to your LAN IP (e.g. `http://192.168.1.5:3000`)

**Capacitor vs Expo in this repo**

| | Capacitor (root) | Expo (`/expo`) |
|---|---|---|
| Purpose | App Store / Play Store builds | Native RN development |
| UI | WebView shell | Native screens + API |
