# eHazira Frontend

A cross-platform attendance management application built with React, TypeScript, and Capacitor for web, Android, and iOS.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Building](#building)
- [Mobile Apps](#mobile-apps)
- [Features](#features)
- [Architecture](#architecture)

## Overview

eHazira is a mobile-first attendance application designed for educational institutions. The frontend provides interfaces for:

- Teachers: Manage classes, take attendance, view reports
- Students: Mark attendance, view schedule, track attendance percentage
- Organization Admins: Manage teachers, departments, and settings

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Mobile | Capacitor 6 |
| Authentication | Firebase Auth + Google OAuth |
| Real-time | Native WebSocket |
| UI Components | shadcn/ui (Radix UI) |

## Project Structure

```
ehazira-frontend/
├── src/
│   ├── components/
│   │   ├── auth/            # Login, authentication screens
│   │   ├── teacher/         # Teacher-specific components
│   │   ├── student/         # Student-specific components
│   │   ├── ui/              # Reusable UI components (shadcn)
│   │   └── Onboarding.tsx   # First-launch onboarding
│   ├── services/
│   │   ├── api.ts           # REST API client (axios)
│   │   └── websocket.ts     # WebSocket service
│   ├── store/
│   │   ├── auth.ts          # Authentication state
│   │   └── attendance.ts    # Attendance state
│   ├── types/               # TypeScript type definitions
│   ├── utils/
│   │   ├── native.ts        # Capacitor native utilities
│   │   └── constants.ts     # App constants
│   ├── config/
│   │   └── firebase.ts      # Firebase configuration
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── android/                 # Android native project
├── ios/                     # iOS native project
├── public/                  # Static assets
├── capacitor.config.ts      # Capacitor configuration
├── tailwind.config.js       # Tailwind configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ehazira-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., http://localhost:8000) |
| `VITE_WS_URL` | WebSocket URL (e.g., ws://localhost:8000) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

### Example .env.local

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building

### Web Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Production Deployment (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

Required vercel.json for SPA routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Mobile Apps

### Capacitor Setup

```bash
# Install Capacitor CLI globally (optional)
npm install -g @capacitor/cli

# Build web assets
npm run build

# Sync web assets to native projects
npx cap sync
```

### Android Development

```bash
# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

#### Android Requirements

- Android Studio Arctic Fox or later
- Android SDK 24+ (Android 7.0)
- Target SDK 34 (Android 14)

#### Building APK

1. Open project in Android Studio
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. APK will be in `android/app/build/outputs/apk/`

#### Building Release APK

1. Generate signing key (if not exists)
2. Configure signing in `android/app/build.gradle`
3. Build > Generate Signed Bundle / APK

### iOS Development

```bash
# Open in Xcode
npx cap open ios
```

#### iOS Requirements

- macOS with Xcode 14+
- iOS 14+ deployment target
- Apple Developer account (for device testing/distribution)

#### Building for Device

1. Open project in Xcode
2. Select your team in Signing & Capabilities
3. Select target device
4. Build and run

### Capacitor Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.ehazira.app',
  appName: 'eHazira',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '<your-server-client-id>',
      forceCodeForRefreshToken: false,
    },
  },
};
```

### Native Plugins Used

| Plugin | Purpose |
|--------|---------|
| @capacitor/app | App lifecycle, back button handling |
| @capacitor/device | Device information |
| @capacitor/filesystem | File storage for exports |
| @capacitor/geolocation | GPS location for attendance |
| @capacitor/haptics | Haptic feedback |
| @capacitor/share | File sharing |
| @capacitor/splash-screen | Splash screen |
| @capacitor/status-bar | Status bar styling |
| @codetrix-studio/capacitor-google-auth | Google Sign-In |

## Features

### Teacher Features

| Feature | Description |
|---------|-------------|
| Dashboard | Overview of classes, today's schedule, quick stats |
| Class Management | Create classes, add students (manual/CSV import) |
| Subject Management | Create subjects, assign periods |
| Attendance | Initiate session, display OTP, real-time status |
| Reports | Class-wise and subject-wise attendance reports |
| Export | Download attendance as CSV (register format) |
| Announcements | Post announcements to classes |
| Device Reset | Reset student device for re-login |

### Student Features

| Feature | Description |
|---------|-------------|
| Dashboard | Attendance overview, today's classes |
| Mark Attendance | Enter OTP when session is active |
| Schedule | View daily and weekly class schedule |
| Attendance History | View detailed attendance records |
| Announcements | View class announcements |
| Profile | View personal and class information |

### Security Features

| Feature | Description |
|---------|-------------|
| Device Binding | Students can only login from one device |
| Web Blocking | Students must use mobile app |
| GPS Validation | Proximity check for offline classes |
| OTP Expiry | Short-lived OTP (15 seconds) |

## Architecture

### State Management

```
Zustand Stores
├── auth.ts          # User authentication state
│   ├── user         # Current user info
│   ├── accessToken  # JWT access token
│   ├── refreshToken # JWT refresh token
│   └── deviceId     # Device identifier
└── attendance.ts    # Attendance state
    ├── activeSession # Current active session
    └── submissions   # Real-time submission updates
```

### API Layer

```
services/
├── api.ts           # Axios instance + API functions
│   ├── authAPI      # Authentication endpoints
│   ├── classAPI     # Class management
│   ├── attendanceAPI # Attendance operations
│   ├── scheduleAPI  # Schedule endpoints
│   ├── studentAPI   # Student-specific endpoints
│   └── teacherAPI   # Teacher-specific endpoints
└── websocket.ts     # WebSocket connection management
```

### Data Flow

```
User Action
    │
    ▼
React Component
    │
    ├──► useMutation (write) ──► API ──► Backend
    │
    └──► useQuery (read) ──► API ──► Backend
                                        │
                                        ▼
                              React Query Cache
                                        │
                                        ▼
                              Component Re-render
```

### WebSocket Flow

```
Backend Event
    │
    ▼
WebSocket Service
    │
    ▼
Zustand Store Update
    │
    ▼
Component Re-render
```

## License

Proprietary - All rights reserved.
