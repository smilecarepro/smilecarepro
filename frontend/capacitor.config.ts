import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smilecare.app',
  appName: 'SmileCare',
  webDir: 'dist',
  server: {
    url: 'https://big-production-b648.up.railway.app',
    cleartext: true
  }
};

export default config;
