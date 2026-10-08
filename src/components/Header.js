import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({
  theme,
  isDarkMode,
  toggleTheme,
  toggleSidebar,
  sidebarCollapsed,
  isDesktop,
  chatTitle = 'DigiCrop AI',
  onRenameChat,
  toggleRightPanel,
  rightPanelOpen = true,
  currentScreen = 'AI Assistant',
}) {
  const insets = useSafeAreaInsets();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chatTitle);

  useEffect(() => {
    setTitleInput(chatTitle);
  }, [chatTitle]);

  const handleFinishRename = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput.trim() !== chatTitle && onRenameChat) {
      onRenameChat(titleInput.trim());
    }
  };

  const isChatScreen = currentScreen === 'AI Assistant';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceDark || theme.surface,
          borderBottomColor: theme.border,
          paddingTop: Platform.OS === 'web' ? 8 : Math.max(insets.top, 8),
        },
      ]}
    >
      {/* Left: Left Sidebar Toggle Button - Always visible, never clipped */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={toggleSidebar}
          style={[styles.iconBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          title="Toggle sidebar (Ctrl+B)"
          activeOpacity={0.7}
        >
          <Feather name="sidebar" size={17} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Center: Current Chat Title (Click to rename) - Truncates smoothly without pushing controls */}
      <View style={styles.centerSection}>
        {isChatScreen ? (
          isEditingTitle ? (
            <TextInput
              style={[
                styles.titleInput,
                {
                  color: theme.text,
                  borderColor: theme.primary,
                  backgroundColor: theme.background,
                },
              ]}
              value={titleInput}
              onChangeText={setTitleInput}
              autoFocus
              onBlur={handleFinishRename}
              onSubmitEditing={handleFinishRename}
              maxLength={60}
            />
          ) : (
            <TouchableOpacity
              style={styles.titleClickable}
              onPress={() => setIsEditingTitle(true)}
              title="Click to rename chat"
            >
              <Text style={[styles.chatTitleText, { color: theme.text }]} numberOfLines={1}>
                {chatTitle || 'New chat'}
              </Text>
              <Feather
                name="edit-2"
                size={12}
                color={theme.textSecondary}
                style={{ marginLeft: 6, opacity: 0.6 }}
              />
            </TouchableOpacity>
          )
        ) : (
          <Text style={[styles.screenTitleText, { color: theme.text }]} numberOfLines={1}>
            {currentScreen}
          </Text>
        )}
      </View>

      {/* Right: Right Knowledge Panel Toggle & Theme Toggle - Always visible */}
      <View style={styles.rightSection}>
        {isChatScreen && (
          <TouchableOpacity
            onPress={toggleRightPanel}
            style={[
              styles.iconBtn,
              {
                backgroundColor: rightPanelOpen ? theme.primary + '18' : theme.cardBg,
                borderColor: rightPanelOpen ? theme.primary + '40' : theme.border,
                marginRight: 6,
              },
            ]}
            title={rightPanelOpen ? 'Hide Knowledge Panel' : 'Show Knowledge Panel'}
            activeOpacity={0.7}
          >
            <Feather
              name="database"
              size={16}
              color={rightPanelOpen ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Theme Toggle Button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.iconBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          accessibilityLabel="Toggle Dark/Light Mode"
          activeOpacity={0.7}
        >
          <Feather name={isDarkMode ? 'sun' : 'moon'} size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    zIndex: 5,
    width: '100%',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    minWidth: 0, // Allows child text to truncate properly
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
  },
  chatTitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 280,
    textAlign: 'center',
  },
});
