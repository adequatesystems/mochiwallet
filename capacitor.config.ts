import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mochimo.ioswallet',
  appName: 'Mochimo Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
