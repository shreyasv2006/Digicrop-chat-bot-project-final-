import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DCLogo from './DCLogo';
import { datasetService } from '../services/datasetService';
import { getUserProfileFromStorage } from '../screens/Settings';

export default function Header({ 
  theme, 
  isDarkMode, 
  toggleTheme, 
  toggleSidebar, 
  isDesktop, 
  title, 
  onNewSession,
  onOpenUploadModal,
}) {
  const insets = useSafeAreaInsets();
  const [profileName, setProfileName] = useState('');
  const farmIds = datasetService.getLoadedFarmIds();
  const farmLabel = farmIds.length > 0 ? `Farms (${farmIds.join(', ')})` : null;

  useEffect(() => {
    const p = getUserProfileFromStorage();
    setProfileName(p.displayName || '');
  }, [title]);

  const getInitials = () => {
    if (!profileName.trim()) return 'DC';
    const parts = profileName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

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

        <View style={{ marginRight: 10 }}>
          <DCLogo size={32} theme={theme} />
        </View>

        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              DigiCrop <Text style={{ color: theme.primary }}>AI</Text>
            </Text>
            <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>

      {/* Active Context */}
      {isDesktop && farmLabel && (
        <View style={[styles.contextSelector, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="location-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.contextValueText, { color: theme.text }]}>{farmLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={theme.textSecondary} style={{ marginLeft: 6 }} />
        </View>
      )}

      {/* Controls & User Profile */}
      <View style={styles.controlsRow}>
        {/* Add Dataset Button */}
        <TouchableOpacity 
          style={[styles.addDatasetBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={onOpenUploadModal}
          title="Add or paste a custom dataset (.csv / .md / .txt)"
        >
          <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.addDatasetText, { color: theme.text }]}>+ Add Dataset</Text>
        </TouchableOpacity>

        {/* New Session Button */}
        <TouchableOpacity 
          style={[styles.newSessionBtn, { backgroundColor: theme.primary }]}
          onPress={onNewSession}
        >
          <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.newSessionText}>New Session</Text>
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={16} color={theme.text} />
        </TouchableOpacity>

        {/* Profile Avatar */}
        <View style={[styles.profilePill, { borderLeftColor: theme.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{getInitials()}</Text>
          </View>
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
    paddingVertical: 12,
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
    width: 34,
    height: 34,
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
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginLeft: 8,
  },
  contextSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  contextValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDatasetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
  },
  addDatasetText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  newSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 10,
  },
  newSessionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    borderLeftWidth: 1,
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});

