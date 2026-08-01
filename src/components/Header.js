import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ theme, isDarkMode, toggleTheme, toggleSidebar, isDesktop, title }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.surface,
        borderBottomColor: theme.border,
        paddingTop: Platform.OS === 'web' ? SIZES.md : Math.max(insets.top, SIZES.md)
      }
    ]}>
      <View style={styles.leftSection}>
        {!isDesktop && (
          <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
            <Ionicons name="menu" size={26} color={theme.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{title || 'AgriSense'}</Text>
          {isDesktop && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Smart insights for better agricultural decisions
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity onPress={toggleTheme} style={[styles.iconButton, { backgroundColor: theme.background }]}>
          <Ionicons 
            name={isDarkMode ? "sunny" : "moon"} 
            size={22} 
            color={theme.text} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.profileText, { color: theme.primary }]}>DR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.sm,
  },
  profileText: {
    fontWeight: 'bold',
    fontSize: 16,
  }
});
