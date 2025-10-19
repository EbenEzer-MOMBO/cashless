import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f2878804043f45e6a2a369723265ac14',
  appName: 'cacheless-vault',
  webDir: 'dist',
  server: {
    url: 'https://f2878804-043f-45e6-a2a3-69723265ac14.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2E7D32',
      showSpinner: false
    }
  }
};

export default config;