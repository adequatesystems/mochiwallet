import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mochimo.androidwallet',
  appName: 'Mochimo Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
