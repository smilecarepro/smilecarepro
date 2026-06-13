import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smilecare.app',
  appName: 'SmileCare',
  webDir: 'dist',
  server: {
    url: 'https://smilecarepro-production.up.railway.app',
    cleartext: true
  }
};

export default config;
