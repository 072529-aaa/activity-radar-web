# 活动雷达 Android

Capacitor Android wrapper for the ActivityRadar PWA.

## Prerequisites

- JDK 17
- Android SDK with `ANDROID_HOME` set
- Node.js 20+

## Build

```bash
npm ci
npx cap sync android
cd android
./gradlew assembleRelease
```

The release build is signed only when the following environment variables are present:

- `ACTIVITY_RADAR_KEYSTORE`
- `ACTIVITY_RADAR_KEYSTORE_PASSWORD`
- `ACTIVITY_RADAR_KEY_ALIAS`
- `ACTIVITY_RADAR_KEY_PASSWORD`

The keystore and passwords are never committed to the repository. APK output appears under `android/app/build/outputs/apk/release/`.

## Permissions

`ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` are declared in `AndroidManifest.xml` for the in-app GPS city matching feature. Capacitor's WebView runtime handles the Android permission prompt when the browser Geolocation API is used.

## Geolocation plugin

`@capacitor/geolocation` is declared in `package.json`; run `npx cap sync android` after `npm ci` so the generated Android project includes `:capacitor-geolocation`. The APK requests location permission at runtime and falls back to the WebView geolocation API when the native plugin is unavailable.
