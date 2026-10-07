import { Platform } from 'react-native';

export function injectWebFonts() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const fontId = 'expo-vector-icons-web-styles';
    if (!document.getElementById(fontId)) {
      const style = document.createElement('style');
      style.id = fontId;
      style.type = 'text/css';
      style.appendChild(document.createTextNode(`
        @font-face {
          font-family: 'Ionicons';
          src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Feather';
          src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'MaterialIcons';
          src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'FontAwesome';
          src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `));
      document.head.appendChild(style);
    }
  }
}

