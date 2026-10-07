import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '../constants/theme';
import DCLogo from './DCLogo';

export default function WelcomeSection({ theme }) {
  return (
    <View style={styles.container}>
      <View style={{ marginBottom: SIZES.md }}>
        <DCLogo size={64} theme={theme} />
      </View>
      <Text style={[styles.greeting, { color: theme.textSecondary }]}>DigiCrop Agricultural Intelligence</Text>

      <Text style={[styles.question, { color: theme.text }]}>
        How can I assist your farm decisions today?
      </Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Ask general agricultural questions, query farm datasets (e.g. <Text style={{ fontWeight: '600', color: theme.primary }}>"Answer from F001 Farm Dataset"</Text>), compare plots, or upload custom <Text style={{ fontWeight: '600' }}>.md</Text> knowledge files.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 640,
    lineHeight: 22,
  }
});
