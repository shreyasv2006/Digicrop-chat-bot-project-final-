import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ theme, isDarkMode, toggleTheme, toggleSidebar, isDesktop, title, onNewSession }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.surface,
        borderBottomColor: theme.border,
        paddingTop: Platform.OS === 'web' ? SIZES.sm : Math.max(insets.top, SIZES.sm)
      }
    ]}>
      {/* Brand & Status */}
      <View style={styles.brandRow}>
        {!isDesktop && (
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
        )}

        <View style={[styles.logoBox, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
          <Ionicons name="leaf" size={18} color={theme.primary} />
        </View>

        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              DigiCrop <Text style={{ color: theme.primary }}>AI</Text>
            </Text>
            <View style={[styles.cnetBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '40' }]}>
              <Text style={[styles.cnetText, { color: theme.primary }]}>CNET 2026</Text>
            </View>
          </View>
          
          <View style={styles.subtitleRow}>
            <View style={[styles.pulseDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>
              Multispectral Telemetry Core v2.6
            </Text>
          </View>
        </View>
      </View>

      {/* Active Farm Context Selector */}
      {isDesktop && (
        <View style={[styles.contextSelector, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>ACTIVE CONTEXT:</Text>
          <View style={styles.contextValueRow}>
            <Ionicons name="location-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.contextValueText, { color: theme.text }]}>All Monitored Farms (F001–F006)</Text>
            <Ionicons name="chevron-down" size={12} color={theme.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </View>
      )}

      {/* Controls & User Profile */}
      <View style={styles.controlsRow}>
        {/* Model Badge */}
        {isDesktop && (
          <View style={[styles.modelBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '35' }]}>
            <Ionicons name="sparkles" size={13} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.modelText, { color: theme.primary }]}>Groq / Gemini Flash</Text>
            <View style={[styles.groundedChip, { backgroundColor: theme.primary }]}>
              <Text style={styles.groundedChipText}>Grounded</Text>
            </View>
          </View>
        )}

        {/* Sync Button */}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="sync-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Sync Live Data</Text>
        </TouchableOpacity>

        {/* Audit Log */}
        {isDesktop && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Audit Log</Text>
          </TouchableOpacity>
        )}

        {/* New Session Button */}
        <TouchableOpacity 
          style={[styles.newSessionBtn, { backgroundColor: theme.primary }]}
          onPress={onNewSession}
        >
          <Ionicons name="add-circle-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.newSessionText}>New Session</Text>
        </TouchableOpacity>

        {/* Dark Mode Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={16} color={theme.text} />
        </TouchableOpacity>

        {/* Officer Profile Pill */}
        <View style={[styles.profilePill, { borderLeftColor: theme.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>AO</Text>
          </View>
          {isDesktop && (
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: theme.text }]}>Officer S. Jadhav</Text>
              <Text style={[styles.profileRole, { color: theme.textSecondary }]}>Sahyadri Cluster Ops</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    marginRight: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cnetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 6,
  },
  cnetText: {
    fontSize: 9,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '500',
  },
  contextSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginRight: 6,
  },
  contextValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  modelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  groundedChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 6,
  },
  groundedChipText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  newSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  newSessionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  themeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
  },
  avatarBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileMeta: {
    marginLeft: 6,
  },
  profileName: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileRole: {
    fontSize: 9,
  }
});
