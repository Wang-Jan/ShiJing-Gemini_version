import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shijing.app',
  appName: '视净',
  webDir: 'dist',
  server: {
    url: 'https://你的线上域名',
    cleartext: false
  }
};

export default config;