# Rta Mobile App - Testing Setup Guide

## Prerequisites (one-time)

Before testing, make sure these are running in separate terminal tabs:

```bash
# Terminal 1: Backend server
cd ehazira-backend
python manage.py runserver
# or: daphne -b 0.0.0.0 -p 8000 ehazira.asgi:application

# Terminal 2: Frontend dev server
cd ehazira-frontend
npm run dev
```

Both must be running before launching the simulators/emulators.

---

## iOS Testing (Xcode Simulator)

### Quick Start

```bash
cd ehazira-frontend

# Build + sync + open Xcode
npm run build && npx cap sync && npx cap open ios
```

### In Xcode

1. At the top center, you'll see a device dropdown (e.g., "Any iOS Device")
2. Click it and select **iPhone 17 Pro** (or any simulator)
3. Press **Cmd+R** or click the **Play button** (triangle at top-left)
4. Wait for the simulator to boot and the app to install
5. The app will load from your local dev server (`localhost:3000`)

### Simulate GPS Location (for attendance proximity testing)

1. With the simulator running, go to menu: **Features > Location > Custom Location...**
2. Enter latitude/longitude (e.g., `28.6139, 77.2090` for Delhi)
3. Click OK

### Useful Xcode Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+R | Build and run |
| Cmd+. | Stop running |
| Cmd+Shift+K | Clean build folder |
| Cmd+Shift+2 | Open device manager |

### Debug WebView (Safari)

1. Open **Safari** on your Mac
2. Go to **Safari > Settings > Advanced > Show Develop menu in menu bar**
3. With the simulator running: **Develop > Simulator > localhost**
4. Full console, network, and element inspection available

---

## Android Testing (Android Studio Emulator)

### Quick Start

```bash
cd ehazira-frontend

# Build + sync + open Android Studio
npm run build && npx cap sync && npx cap open android
```

### In Android Studio

1. Wait for **Gradle sync** to finish (progress bar at the bottom, first time is slow)
2. At the top bar, you'll see a device dropdown
3. If no emulator exists, create one:
   - **Tools > Device Manager** (right sidebar)
   - Click **Create Virtual Device**
   - Choose **Pixel 7** > Next
   - Select system image **API 34** (download if needed) > Next
   - Finish
4. Select your emulator from the dropdown
5. Click the **green Play button** (triangle)
6. Wait for the emulator to boot and app to install

### Simulate GPS Location

1. Click **"..."** on the emulator's sidebar (Extended Controls)
2. Go to **Location** tab
3. Enter latitude/longitude and click **Send**

### Debug WebView (Chrome)

1. Open **Chrome** on your Mac
2. Go to `chrome://inspect/#devices`
3. Your app's WebView appears under the emulator
4. Click **"inspect"** to open full DevTools

---

## Android Testing on Physical Phone (USB)

### One-time Phone Setup

1. **Enable Developer Options:**
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times rapidly
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to **Settings > Developer Options** (or Settings > System > Developer Options)
   - Turn on **USB Debugging**
   - Some phones: also turn on **Install via USB**

3. **Connect via USB:**
   - Plug your phone into your Mac with a USB cable
   - A dialog will appear on your phone: **"Allow USB debugging?"**
   - Check "Always allow from this computer" and tap **Allow**

### Run on Phone

```bash
cd ehazira-frontend

# List connected devices to verify
adb devices

# You should see something like:
# List of devices attached
# XXXXXXXX    device

# Build, sync, and run directly on phone
npm run build && npx cap sync && npx cap run android
```

When running `npx cap run android`, it will show a list of available devices (emulators + connected phones). Select your phone.

Alternatively, in Android Studio:
1. Your phone will appear in the device dropdown alongside emulators
2. Select it and click Play

### Important: Network Configuration for USB Testing

Your phone needs to reach your Mac's backend server. Since `localhost` on the phone refers to the phone itself, you need your Mac's local IP:

```bash
# Find your Mac's IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for something like 192.168.x.x
```

Then update `capacitor.config.ts`:

```typescript
server: {
  url: 'http://192.168.x.x:3000',  // Your Mac's IP, not localhost
  cleartext: true,
}
```

And rebuild:

```bash
npm run build && npx cap sync
```

Also make sure your Mac and phone are on the **same Wi-Fi network**, OR use ADB reverse port forwarding:

```bash
# This maps phone's localhost:3000 to Mac's localhost:3000
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8000 tcp:8000
```

With ADB reverse, you can keep `localhost:3000` in the config.

---

## iOS Testing on Physical iPhone (USB)

### Requirements

- Apple ID (free for testing, $99/year for App Store)
- Lightning or USB-C cable

### Setup

1. Connect iPhone to Mac via USB
2. Trust the computer on your iPhone if prompted
3. Open Xcode: `npx cap open ios`
4. In Xcode top bar, select your iPhone (it appears alongside simulators)
5. You may need to set a **Development Team**:
   - Click on the **App** project in the sidebar
   - Go to **Signing & Capabilities** tab
   - Select your Apple ID under **Team**
   - Xcode will create a provisioning profile automatically
6. Click Play (Cmd+R)
7. First time: on your iPhone go to **Settings > General > VPN & Device Management** and trust your developer certificate

### Network for iPhone USB

Same as Android — use your Mac's local IP or set up a proxy. No `adb reverse` equivalent for iOS, so you must use your Mac's IP address in the Capacitor config.

---

## Everyday Development Workflow

```bash
# 1. Start backend (Terminal 1)
cd ehazira-backend && python manage.py runserver

# 2. Start frontend dev server (Terminal 2)
cd ehazira-frontend && npm run dev

# 3. Run on simulator (Terminal 3)
cd ehazira-frontend
npx cap run ios       # iOS simulator
# or
npx cap run android   # Android emulator/phone
```

For code changes during development:
- **Web code changes** (React components, CSS, etc.) — auto-reload via dev server, no rebuild needed
- **Native config changes** (Info.plist, AndroidManifest, plugins) — need `npx cap sync`
- **New plugin added** — need `npx cap sync` then rebuild in IDE

---

## Troubleshooting

### App shows white/blank screen
- Is `npm run dev` running?
- Check the Capacitor config `server.url` matches your dev server
- For USB phone testing: did you update the IP? Try `adb reverse`

### Xcode build fails with signing error
- Select a Development Team in Signing & Capabilities
- If using free Apple ID: change Bundle Identifier to something unique

### Android Gradle sync fails
- Make sure Java 17 is installed: `java -version`
- Make sure ANDROID_HOME is set: `echo $ANDROID_HOME`
- Try: File > Invalidate Caches > Restart

### GPS not working in simulator/emulator
- iOS: Features > Location > Custom Location
- Android: Extended Controls > Location > Send coordinates
- Simulators don't have real GPS — you must set a mock location

### "net::ERR_CLEARTEXT_NOT_PERMITTED" on Android
- The AndroidManifest.xml needs `android:usesCleartextTraffic="true"` on the `<application>` tag (already configured)
