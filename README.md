# CourseCollab Mobile

Native iOS, Android, and iPadOS app for [CourseCollab](https://coursecollab.vercel.app). The shell loads the production web app so the UI matches the **mobile responsive layout** exactly.

## Architecture

- **Capacitor 7** wraps a WebView pointed at `https://coursecollab.vercel.app`
- Brand colors from the web app (`#582c83` PVAMU purple)
- iPad uses `preferredContentMode: mobile` for the same layout as phone
- Offline fallback: branded splash in `www/`

## Prerequisites

- Node.js 20+
- **iOS:** Xcode 15+, CocoaPods (`sudo gem install cocoapods`)
- **Android:** Android Studio, JDK 17

## Setup

```bash
cd course-collab-mobile
npm install
npm run cap:sync
```

## Run

```bash
# iOS Simulator
npm run cap:open:ios

# Android Emulator
npm run cap:open:android
```

In Xcode/Android Studio, pick a simulator and press Run.

## Local web dev (optional)

To point at a local Next.js server instead of production, edit `capacitor.config.ts`:

```ts
server: {
  url: "http://localhost:3000",
  cleartext: true,
}
```

Use your machine's LAN IP (not `localhost`) when testing on a physical device.

## App Store notes

- Bundle ID: `com.coursecollab.app`
- Icons/splash generated via `npm run build`
- Stripe checkout and external links are allowlisted in Capacitor config

## GitHub

Local git is initialized on `main`. Create the remote repo (PAT needs **repo** / repository creation permission), then:

```bash
gh repo create course-collab-mobile --public --source=. --remote=origin --push
```

Or create [github.com/new](https://github.com/new) named `course-collab-mobile`, then:

```bash
git remote add origin git@github.com:DanielDoe/course-collab-mobile.git
git push -u origin main
```

## iOS note

Full **Xcode** (not Command Line Tools only) is required. After installing Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
cd ios/App && pod install
npm run cap:open:ios
```

