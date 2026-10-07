import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import DCLogo from './DCLogo';

const MENU_ITEMS = [
  { id: '1', icon: 'grid', title: 'Dashboard' },
  { id: '2', icon: 'chatbubbles', title: 'AI Assistant' },
  { id: '3', icon: 'leaf', title: 'Crop Health' },
  { id: '4', icon: 'partly-sunny', title: 'Weather Insights' },
  { id: '5', icon: 'earth', title: 'Soil Analysis' },
  { id: '6', icon: 'stats-chart', title: 'Vegetation Indices' },
  { id: '6.5', icon: 'pulse', title: 'Agent Monitor' },
  { id: '7', icon: 'bookmark', title: 'Saved' },
];

export default function Sidebar({ theme, isDesktop, closeSidebar, currentScreen, onSelectScreen }) {
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.surface,
        borderRightColor: theme.border,
      },
      !isDesktop && styles.mobileContainer
    ]}>
      <View style={styles.header}>
        <View style={{ marginRight: SIZES.sm }}>
          <DCLogo size={32} theme={theme} />
        </View>
        <Text style={[styles.logoText, { color: theme.text }]}>DigiCrop AI</Text>
        
        {!isDesktop && (
          <TouchableOpacity onPress={closeSidebar} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>


      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => {
          const isActive = currentScreen === item.title;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                isActive && { backgroundColor: theme.primary + '15' }
              ]}
              onPress={() => {
                onSelectScreen(item.title);
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
            >
              <Ionicons 
                name={item.icon} 
                size={20} 
                color={isActive ? theme.primary : theme.textSecondary} 
              />
              <Text style={[
                styles.menuText,
                { color: isActive ? theme.primary : theme.textSecondary },
                isActive && styles.menuTextActive
              ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.menuItem,
            currentScreen === 'Settings' && { backgroundColor: theme.primary + '15' }
          ]}
          onPress={() => {
            onSelectScreen('Settings');
            if (!isDesktop && closeSidebar) closeSidebar();
          }}
        >
          <Ionicons 
            name="settings-outline" 
            size={20} 
            color={currentScreen === 'Settings' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.menuText,
            { color: currentScreen === 'Settings' ? theme.primary : theme.textSecondary },
            currentScreen === 'Settings' && styles.menuTextActive
          ]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: Platform.OS === 'web' ? 0 : SIZES.md,
  },
  mobileContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: SIZES.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    marginBottom: 4,
    height: 42,
  },
  menuText: {
    fontSize: 14,
    marginLeft: SIZES.md,
    fontWeight: '500',
  },
  menuTextActive: {
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  }
});
