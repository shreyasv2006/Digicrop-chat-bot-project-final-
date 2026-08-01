import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function Settings({ theme, isDarkMode, toggleTheme }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* General Settings */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>General Preferences</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Switch application look and feel theme</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? '#FFF' : '#F4F3F0'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Measurement Units</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Use metric values (Celsius, meters, kg)</Text>
          </View>
          <Switch
            value={true}
            disabled={true}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={'#FFF'}
          />
        </View>
      </View>

      {/* Account Profile Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Account Information</Text>
        <View style={styles.profileRow}>
          <View style={[styles.profileAvatar, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>DR</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={[styles.profileName, { color: theme.text }]}>DigiCrop Researcher</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>researcher@digicrop.com</Text>
          </View>
        </View>
      </View>

      {/* System About Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>About AgriSense AI</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Application Version</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0 (Expo SDK 57)</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Model Backend</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>AgriSense Core v2</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SIZES.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SIZES.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.sm,
  },
  settingText: {
    flex: 1,
    marginRight: SIZES.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  }
});
