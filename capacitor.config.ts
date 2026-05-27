import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.serenapp.app',
  appName: 'SerenApp',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_serenapp',
      iconColor: '#7B68A6',
    },
  },
};

export default config;
