import { Platform } from 'react-native';

export function injectWebFonts() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const fontId = 'expo-vector-icons-ionicons-cdn';
    if (!document.getElementById(fontId)) {
      const style = document.createElement('style');
      style.id = fontId;
      style.type = 'text/css';
      style.appendChild(document.createTextNode(`
        @font-face {
          font-family: 'Ionicons';
          src: url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/5.5.2/fonts/ionicons.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `));
      document.head.appendChild(style);
    }
  }
}
