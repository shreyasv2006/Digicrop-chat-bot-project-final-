import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function WelcomeSection({ theme }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="leaf" size={48} color={theme.primary} />
      </View>
      <Text style={[styles.greeting, { color: theme.text }]}>Good evening</Text>
      <Text style={[styles.question, { color: theme.text }]}>
        How can I help you with your agriculture insights today?
      </Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Ask questions about crops, soil, weather, vegetation health, and agricultural indices.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    paddingHorizontal: SIZES.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 24,
  }
});
