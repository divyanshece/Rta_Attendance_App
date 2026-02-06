import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ehazira.app',
  appName: 'Rta',
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
      serverClientId: '1039107164512-dq4up6d2u7ke29seehpcmroet0od7a4g.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
