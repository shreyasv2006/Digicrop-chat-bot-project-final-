import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import DCLogo from './DCLogo';
import {
  getSectionCollapseState,
  setSectionCollapseState,
} from '../services/chatStorage';
import { confirmDialog, alertDialog, showToast } from '../services/dialogService';

const NAV_ITEMS = [
  { id: '1', icon: 'grid-outline', title: 'Dashboard' },
  { id: '2', icon: 'sparkles-outline', title: 'AI Assistant' },
  { id: '3', icon: 'leaf-outline', title: 'Crop Health' },
  { id: '4', icon: 'partly-sunny-outline', title: 'Weather Insights' },
  { id: '5', icon: 'flask-outline', title: 'Soil Analysis' },
  { id: '6', icon: 'trending-up-outline', title: 'Vegetation Indices' },
  { id: '6.5', icon: 'pulse-outline', title: 'Agent Monitor' },
  { id: '7', icon: 'bookmark-outline', title: 'Saved' },
];

const SORT_PREF_KEY = 'digicrop_chat_sort_by';

export default function Sidebar({
  theme,
  isDesktop,
  isCollapsed = false,
  onToggleCollapse,
  closeSidebar,
  currentScreen,
  onSelectScreen,
  onNewChat,
  onOpenUploadModal,
  chats = [],
  activeChatId,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onToggleStarChat,
  onTogglePinChat,
  profiles = [],
  activeProfile = null,
  onSelectProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  isGenerating = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const searchInputRef = useRef(null);

  // Sorting preference: 'activity' (Last activity) | 'created' (Date created)
  const [sortBy, setSortBy] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(SORT_PREF_KEY) || 'activity';
      }
    } catch (e) {}
    return 'activity';
  });
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Section collapse states per profile
  const activeProfileId = activeProfile?.id || 'profile_default';
  const [pinnedCollapsed, setPinnedCollapsed] = useState(() =>
    getSectionCollapseState(activeProfileId, 'pinned')
  );
  const [chatsCollapsed, setChatsCollapsed] = useState(() =>
    getSectionCollapseState(activeProfileId, 'chats')
  );

  // Profile popup state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isRenamingProfile, setIsRenamingProfile] = useState(false);
  const [renameProfileInput, setRenameProfileInput] = useState('');

  useEffect(() => {
    setPinnedCollapsed(getSectionCollapseState(activeProfileId, 'pinned'));
    setChatsCollapsed(getSectionCollapseState(activeProfileId, 'chats'));
    setProfileMenuOpen(false);
  }, [activeProfileId]);

  const handleSortChange = (mode) => {
    setSortBy(mode);
    setSortMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SORT_PREF_KEY, mode);
      }
    } catch (e) {}
  };

  const togglePinnedSection = () => {
    const next = !pinnedCollapsed;
    setPinnedCollapsed(next);
    setSectionCollapseState(activeProfileId, 'pinned', next);
  };

  const toggleChatsSection = () => {
    const next = !chatsCollapsed;
    setChatsCollapsed(next);
    setSectionCollapseState(activeProfileId, 'chats', next);
  };

  const displayName = activeProfile?.name || 'User';
  const initials = (() => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  })();

  // Filter & Sort chats
  const sortedChats = useMemo(() => {
    const copy = [...chats];
    if (sortBy === 'created') {
      copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      copy.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    return copy;
  }, [chats, sortBy]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return sortedChats;
    const q = searchQuery.toLowerCase().trim();
    return sortedChats.filter((c) => {
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchMsg =
        Array.isArray(c.messages) &&
        c.messages.some((m) => (m.text || '').toLowerCase().includes(q));
      return matchTitle || matchMsg;
    });
  }, [sortedChats, searchQuery]);

  // Separate into Pinned vs Regular Chats
  const pinnedChats = useMemo(() => {
    return filteredChats.filter((c) => !!c.isPinned);
  }, [filteredChats]);

  const regularChats = useMemo(() => {
    return filteredChats.filter((c) => !c.isPinned);
  }, [filteredChats]);

  // Keyboard navigation & Shortcuts (Ctrl+K to search, Esc, F2, Arrow keys)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        // Ctrl/Cmd + K => Focus Search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (isCollapsed && onToggleCollapse) {
            onToggleCollapse();
          }
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }

        // F2 => Rename active chat
        if (e.key === 'F2' && activeChatId) {
          const activeObj = chats.find((c) => c.id === activeChatId);
          if (activeObj) {
            handleStartRename(activeObj);
          }
        }

        // Arrow keys navigation between chat rows
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && filteredChats.length > 0) {
          const currentIndex = filteredChats.findIndex((c) => c.id === activeChatId);
          if (e.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % filteredChats.length;
            if (onSelectChat) onSelectChat(filteredChats[nextIndex].id);
          } else if (e.key === 'ArrowUp') {
            const prevIndex = currentIndex <= 0 ? filteredChats.length - 1 : currentIndex - 1;
            if (onSelectChat) onSelectChat(filteredChats[prevIndex].id);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [filteredChats, activeChatId, isCollapsed, chats]);

  const handleStartRename = (chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || '');
    setMenuOpenChatId(null);
  };

  const handleFinishRename = (chatId) => {
    if (editingTitle.trim() && onRenameChat) {
      onRenameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleConfirmDelete = async (chat) => {
    setMenuOpenChatId(null);
    const ok = await confirmDialog({
      title: 'Delete Chat',
      message: `Delete conversation "${chat.title}"?`,
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (ok && onDeleteChat) {
      onDeleteChat(chat.id);
      showToast('Chat deleted', 'info');
    }
  };

  const handleCreateProfileSubmit = () => {
    if (newProfileName.trim() && onCreateProfile) {
      onCreateProfile(newProfileName.trim());
      setNewProfileName('');
      setIsAddingProfile(false);
      setProfileMenuOpen(false);
      showToast('Profile created', 'success');
    }
  };

  const handleRenameProfileSubmit = () => {
    if (renameProfileInput.trim() && onRenameProfile && activeProfileId) {
      onRenameProfile(activeProfileId, renameProfileInput.trim());
      setRenameProfileInput('');
      setIsRenamingProfile(false);
      setProfileMenuOpen(false);
      showToast('Profile renamed', 'success');
    }
  };

  const handleDeleteProfileConfirm = async () => {
    if (profiles.length <= 1) {
      await alertDialog({
        title: 'Delete Profile',
        message: 'Cannot delete the only remaining profile.',
      });
      return;
    }

    const ok = await confirmDialog({
      title: 'Delete Profile',
      message: `Delete profile "${displayName}"? All chats in this profile will be permanently deleted.`,
      confirmText: 'Delete Profile',
      isDestructive: true,
    });

    if (ok) {
      if (onDeleteProfile) onDeleteProfile(activeProfileId);
      setProfileMenuOpen(false);
      showToast('Profile deleted', 'info');
    }
  };


  const sidebarWidth = isCollapsed ? 64 : 280;

  const renderChatItem = (c) => {
    const isActive = activeChatId === c.id;
    const isEditing = editingChatId === c.id;
    const isMenuOpen = menuOpenChatId === c.id;
    const isChatGenerating = isActive && isGenerating;

    return (
      <View key={c.id} style={styles.chatRowWrapper}>
        <TouchableOpacity
          style={[
            styles.chatRow,
            isActive && { backgroundColor: theme.primary + '18' },
          ]}
          onPress={() => {
            if (onSelectChat) onSelectChat(c.id);
            onSelectScreen('AI Assistant');
            if (!isDesktop && closeSidebar) closeSidebar();
          }}
          activeOpacity={0.7}
        >
          {/* Fixed 20px column for 6px status dot */}
          <View style={styles.iconCol20}>
            <View
              style={[
                styles.statusDot,
                isActive
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: 'transparent', borderColor: theme.textSecondary },
                isChatGenerating && styles.pulsingDot,
              ]}
            />
          </View>

          {isEditing ? (
            <TextInput
              style={[
                styles.renameInput,
                {
                  color: theme.text,
                  borderColor: theme.primary,
                  backgroundColor: theme.background,
                },
              ]}
              value={editingTitle}
              onChangeText={setEditingTitle}
              autoFocus
              onBlur={() => handleFinishRename(c.id)}
              onSubmitEditing={() => handleFinishRename(c.id)}
            />
          ) : (
            <Text
              style={[
                styles.chatRowTitle,
                { color: isActive ? theme.text : theme.textSecondary },
                isActive && { fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {c.title || 'Untitled chat'}
            </Text>
          )}

          {/* Right edge "..." button on hover/active */}
          {!isEditing && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                setMenuOpenChatId(isMenuOpen ? null : c.id);
              }}
              title="Chat options"
            >
              <Feather name="more-horizontal" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Dropdown menu for Pin/Unpin, Rename, Delete */}
        {isMenuOpen && (
          <View
            style={[
              styles.chatMenuDropdown,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={styles.menuActionItem}
              onPress={() => {
                setMenuOpenChatId(null);
                if (onTogglePinChat) onTogglePinChat(c.id);
              }}
            >
              <Feather
                name="pin"
                size={12}
                color={c.isPinned ? theme.primary : theme.text}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.menuActionText, { color: theme.text }]}>
                {c.isPinned ? 'Unpin' : 'Pin to top'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuActionItem}
              onPress={() => {
                setMenuOpenChatId(null);
                if (onToggleStarChat) onToggleStarChat(c.id);
              }}
            >
              <Ionicons
                name={c.isStarred ? 'star-outline' : 'star'}
                size={12}
                color={c.isStarred ? theme.text : '#F59E0B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.menuActionText, { color: theme.text }]}>
                {c.isStarred ? 'Unstar' : 'Star'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuActionItem}
              onPress={() => handleStartRename(c)}
            >
              <Feather name="edit-2" size={12} color={theme.text} style={{ marginRight: 6 }} />
              <Text style={[styles.menuActionText, { color: theme.text }]}>
                Rename <Text style={{ fontSize: 10, opacity: 0.6 }}>(F2)</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuActionItem}
              onPress={() => handleConfirmDelete(c)}
            >
              <Feather name="trash-2" size={12} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={[styles.menuActionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          backgroundColor: theme.surface,
          borderRightColor: theme.border,
        },
        Platform.OS === 'web' && {
          transition: 'width 200ms ease, min-width 200ms ease, max-width 200ms ease',
        },
        !isDesktop && styles.mobileContainer,
      ]}
    >
      {/* ---------------------------------------------------- */}
      {/* ZONE A: TOP (Fixed flexShrink: 0, does not scroll) */}
      {/* ---------------------------------------------------- */}
      <View style={[styles.zoneA, isCollapsed && styles.zoneACollapsed]}>
        {/* Row 1: DC Logo (+ DigiCrop AI) + Search Button */}
        {isCollapsed ? (
          <View style={styles.railTopCol}>
            {/* Centered DC Logo Mark */}
            <TouchableOpacity
              style={styles.railLogoBtn}
              onPress={() => {
                onSelectScreen('AI Assistant');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
              title="DigiCrop AI"
              activeOpacity={0.8}
            >
              <DCLogo size={24} theme={theme} />
            </TouchableOpacity>

            {/* Centered Search Button */}
            <TouchableOpacity
              style={styles.railIconBtn}
              onPress={() => {
                onToggleCollapse?.();
                setTimeout(() => searchInputRef.current?.focus(), 250);
              }}
              title="Search chats (Ctrl+K)"
              activeOpacity={0.7}
            >
              <Feather name="search" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.logoRow}
              onPress={() => {
                onSelectScreen('AI Assistant');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.iconCol20}>
                <DCLogo size={24} theme={theme} />
              </View>
              <Text style={[styles.logoText, { color: theme.text }]} numberOfLines={1}>
                DigiCrop <Text style={{ color: theme.primary }}>AI</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.headerControlsRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => {
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                title="Search chats (Ctrl+K)"
              >
                <Feather name="search" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {!isDesktop && (
                <TouchableOpacity onPress={closeSidebar} style={styles.headerIconBtn}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}


        {/* Action Buttons: "+ New chat" & "Add Dataset" */}
        <View style={[styles.actionButtons, isCollapsed && styles.actionButtonsCollapsed]}>
          <TouchableOpacity
            style={[
              styles.newChatPillBtn,
              {
                backgroundColor: theme.primary,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                paddingHorizontal: isCollapsed ? 0 : 12,
              },
            ]}
            onPress={() => {
              if (onNewChat) onNewChat();
              if (!isDesktop && closeSidebar) closeSidebar();
            }}
            title="Start a new chat (+ New chat)"
          >
            <View style={styles.iconCol20}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            </View>
            {!isCollapsed && (
              <Text style={styles.newChatPillText} numberOfLines={1}>
                New chat
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.addDatasetPillBtn,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                paddingHorizontal: isCollapsed ? 0 : 12,
              },
            ]}
            onPress={() => {
              if (onOpenUploadModal) onOpenUploadModal();
              if (!isDesktop && closeSidebar) closeSidebar();
            }}
            title="Add or Index Custom Dataset"
          >
            <View style={styles.iconCol20}>
              <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
            </View>
            {!isCollapsed && (
              <Text style={[styles.addDatasetPillText, { color: theme.text }]} numberOfLines={1}>
                Add Dataset
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Nav Items */}
        <View style={[styles.navSection, isCollapsed && styles.navSectionCollapsed]}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.title;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navItem,
                  isCollapsed && styles.navItemCollapsed,
                  isActive && { backgroundColor: theme.primary + '18' },
                ]}
                onPress={() => {
                  onSelectScreen(item.title);
                  if (!isDesktop && closeSidebar) closeSidebar();
                }}
                title={item.title}
              >
                <View style={styles.iconCol20}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isActive ? theme.primary : theme.textSecondary}
                  />
                </View>
                {!isCollapsed && (
                  <Text
                    style={[
                      styles.navText,
                      { color: isActive ? theme.primary : theme.textSecondary },
                      isActive && styles.navTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!isCollapsed && <View style={[styles.divider, { backgroundColor: theme.border }]} />}

      {/* ---------------------------------------------------- */}
      {/* ZONE B: MIDDLE (Fills flex: 1, scrolls independently) */}
      {/* ---------------------------------------------------- */}
      {!isCollapsed && (
        <View style={styles.zoneB}>
          {/* Search Box Bar (Ctrl+K focus) */}
          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Feather name="search" size={13} color={theme.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search (Ctrl+K)..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Escape') setSearchQuery('');
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.zoneBScroll} showsVerticalScrollIndicator={false}>
            {/* SECTION 1: PINNED (Hidden when empty) */}
            {pinnedChats.length > 0 && (
              <View style={styles.sectionBlock}>
                <TouchableOpacity
                  style={styles.sectionHeaderBtn}
                  onPress={togglePinnedSection}
                  accessibilityRole="button"
                  aria-expanded={!pinnedCollapsed}
                >
                  <Ionicons
                    name={pinnedCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={12}
                    color={theme.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Feather name="pin" size={11} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.sectionHeadingText, { color: theme.textSecondary }]}>
                    PINNED ({pinnedChats.length})
                  </Text>
                </TouchableOpacity>

                {!pinnedCollapsed && (
                  <View style={styles.sectionContent}>
                    {pinnedChats.map(renderChatItem)}
                  </View>
                )}
              </View>
            )}

            {/* SECTION 2: CHATS */}
            {regularChats.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <TouchableOpacity
                    style={styles.sectionHeaderBtn}
                    onPress={toggleChatsSection}
                    accessibilityRole="button"
                    aria-expanded={!chatsCollapsed}
                  >
                    <Ionicons
                      name={chatsCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={12}
                      color={theme.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.sectionHeadingText, { color: theme.textSecondary }]}>
                      CHATS
                    </Text>
                  </TouchableOpacity>

                  {/* Sliders sorting button */}
                  <TouchableOpacity
                    style={styles.slidersBtn}
                    onPress={() => setSortMenuOpen(!sortMenuOpen)}
                    title="Sort chats"
                  >
                    <Feather name="sliders" size={13} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Sorting Popup Menu */}
                {sortMenuOpen && (
                  <View
                    style={[
                      styles.sortMenuPopup,
                      { backgroundColor: theme.cardBg, borderColor: theme.border },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.sortMenuItem}
                      onPress={() => handleSortChange('activity')}
                    >
                      <Text
                        style={[
                          styles.sortMenuText,
                          { color: sortBy === 'activity' ? theme.primary : theme.text },
                        ]}
                      >
                        {sortBy === 'activity' ? '✓ ' : ''}Last activity
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortMenuItem}
                      onPress={() => handleSortChange('created')}
                    >
                      <Text
                        style={[
                          styles.sortMenuText,
                          { color: sortBy === 'created' ? theme.primary : theme.text },
                        ]}
                      >
                        {sortBy === 'created' ? '✓ ' : ''}Date created
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!chatsCollapsed && (
                  <View style={styles.sectionContent}>
                    {regularChats.map(renderChatItem)}
                  </View>
                )}
              </View>
            )}

            {/* EMPTY STATES */}
            {filteredChats.length === 0 && (
              <View style={styles.emptyChatsBox}>
                <Text style={[styles.emptyChatsText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'No chats found.' : 'No chats yet. Start a new chat.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ---------------------------------------------------- */}
      {/* ZONE C: BOTTOM (Pinned flexShrink: 0, 1px top border) */}
      {/* ---------------------------------------------------- */}
      <View style={[styles.zoneC, { borderTopColor: theme.border }]}>
        {/* Profile Switcher Popup Menu */}
        {profileMenuOpen && !isCollapsed && (
          <View
            style={[
              styles.profileMenuPopup,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.profileMenuHeader}>
              <Text style={[styles.profileMenuHeading, { color: theme.textSecondary }]}>
                LOCAL PROFILES
              </Text>
              <TouchableOpacity onPress={() => setProfileMenuOpen(false)}>
                <Ionicons name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              {profiles.map((p) => {
                const isSelected = p.id === activeProfileId;
                const pInitials = (p.name || 'User')
                  .trim()
                  .split(/\s+/)
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.profileItemRow,
                      isSelected && { backgroundColor: theme.primary + '18' },
                    ]}
                    onPress={() => {
                      if (onSelectProfile) onSelectProfile(p.id);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.miniAvatar,
                        { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50' },
                      ]}
                    >
                      <Text style={[styles.miniAvatarText, { color: theme.primary }]}>
                        {pInitials}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.profileItemName,
                        { color: theme.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 4 }]} />

            {/* Inline Profile Actions */}
            {isAddingProfile ? (
              <View style={styles.inlineForm}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    { color: theme.text, borderColor: theme.primary, backgroundColor: theme.background },
                  ]}
                  placeholder="Profile name..."
                  placeholderTextColor={theme.textSecondary}
                  value={newProfileName}
                  onChangeText={setNewProfileName}
                  autoFocus
                  onSubmitEditing={handleCreateProfileSubmit}
                />
                <TouchableOpacity
                  style={[styles.inlineBtn, { backgroundColor: theme.primary }]}
                  onPress={handleCreateProfileSubmit}
                >
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : isRenamingProfile ? (
              <View style={styles.inlineForm}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    { color: theme.text, borderColor: theme.primary, backgroundColor: theme.background },
                  ]}
                  placeholder="New name..."
                  placeholderTextColor={theme.textSecondary}
                  value={renameProfileInput}
                  onChangeText={setRenameProfileInput}
                  autoFocus
                  onSubmitEditing={handleRenameProfileSubmit}
                />
                <TouchableOpacity
                  style={[styles.inlineBtn, { backgroundColor: theme.primary }]}
                  onPress={handleRenameProfileSubmit}
                >
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileActionRow}>
                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => {
                    setIsAddingProfile(true);
                    setNewProfileName('');
                  }}
                >
                  <Ionicons name="person-add-outline" size={13} color={theme.primary} />
                  <Text style={[styles.profileActionText, { color: theme.primary }]}>+ Add profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => {
                    setIsRenamingProfile(true);
                    setRenameProfileInput(displayName);
                  }}
                >
                  <Feather name="edit-2" size={12} color={theme.textSecondary} />
                  <Text style={[styles.profileActionText, { color: theme.textSecondary }]}>Rename</Text>
                </TouchableOpacity>

                {profiles.length > 1 && (
                  <TouchableOpacity
                    style={styles.profileActionBtn}
                    onPress={handleDeleteProfileConfirm}
                  >
                    <Feather name="trash-2" size={12} color="#EF4444" />
                    <Text style={[styles.profileActionText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 4 }]} />

            {/* Direct Settings Entry in Profile Menu */}
            <TouchableOpacity
              style={styles.profileMenuSettingsItem}
              onPress={() => {
                setProfileMenuOpen(false);
                onSelectScreen('Settings');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
            >
              <Feather name="settings" size={13} color={theme.text} style={{ marginRight: 6 }} />
              <Text style={[styles.profileMenuSettingsText, { color: theme.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom footer items */}
        {isCollapsed ? (
          <View style={styles.railBottomCol}>
            {/* Gear Button on Top */}
            <TouchableOpacity
              style={styles.railGearBtn}
              onPress={() => {
                onSelectScreen('Settings');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
              title="Settings"
              activeOpacity={0.7}
            >
              <Feather name="settings" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Avatar Button Below */}
            <TouchableOpacity
              style={styles.railAvatarBtn}
              onPress={() => {
                onSelectScreen('Settings');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
              title={`Profile: ${displayName} (Click for Settings)`}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatarBox,
                  { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50' },
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.zoneCFooterRow}>
            <TouchableOpacity
              style={styles.profileRow}
              onPress={() => setProfileMenuOpen(!profileMenuOpen)}
              title={`Profile switcher - ${displayName}`}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatarBox,
                  { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50', flexShrink: 0 },
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.profileSub, { color: theme.textSecondary }]}>Local profile</Text>
              </View>

              <Ionicons
                name={profileMenuOpen ? 'chevron-down' : 'chevron-up'}
                size={14}
                color={theme.textSecondary}
                style={{ flexShrink: 0, marginLeft: 4 }}
              />
            </TouchableOpacity>

            {/* Far Right Gear Icon Button directly to Settings */}
            <TouchableOpacity
              style={styles.gearIconBtn}
              onPress={() => {
                onSelectScreen('Settings');
                if (!isDesktop && closeSidebar) closeSidebar();
              }}
              title="Settings"
              activeOpacity={0.7}
            >
              <Feather name="settings" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
    overflow: 'visible',
    zIndex: 10,
  },
  mobileContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  iconCol20: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneA: {
    flexShrink: 0,
    paddingTop: Platform.OS === 'web' ? 8 : 12,
  },
  zoneACollapsed: {
    paddingTop: 8,
    alignItems: 'center',
  },
  railTopCol: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    width: '100%',
  },
  railLogoBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railCenterCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 44,
  },
  topRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: -0.3,
    marginLeft: 8,
  },
  headerControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  actionButtonsCollapsed: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  newChatPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18, // Pill highlight
    width: '100%',
  },
  newChatPillBtnCollapsed: {
    width: 38,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  addDatasetPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    width: '100%',
  },
  addDatasetPillBtnCollapsed: {
    width: 38,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDatasetPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 8,
  },
  navSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navSectionCollapsed: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 6,
    marginBottom: 2,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 44,
    height: 34,
  },
  navText: {
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '500',
  },
  navTextActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  zoneB: {
    flex: 1,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 30,
    marginBottom: 6,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
  },
  zoneBScroll: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    flex: 1,
  },
  sectionHeadingText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  slidersBtn: {
    padding: 4,
  },
  sortMenuPopup: {
    position: 'absolute',
    right: 4,
    top: 24,
    zIndex: 60,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  sortMenuItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortMenuText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionContent: {
    marginTop: 2,
  },
  chatRowWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 36, // Exact 36px height
    borderRadius: 10, // Exact 10px radius
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  pulsingDot: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chatRowTitle: {
    flex: 1,
    fontSize: 12.5,
  },
  renameInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  moreBtn: {
    padding: 4,
    marginLeft: 4,
    opacity: 0.7,
  },
  chatMenuDropdown: {
    position: 'absolute',
    right: 6,
    top: 32,
    zIndex: 80,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  menuActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  menuActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyChatsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyChatsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  zoneC: {
    flexShrink: 0,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    position: 'relative',
  },
  zoneCCollapsed: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    alignItems: 'center',
  },
  railBottomCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 12,
    paddingTop: 6,
    width: '100%',
  },
  railGearBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railAvatarBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  profileRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 44,
    flex: 0,
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
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  profileName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  profileSub: {
    fontSize: 10.5,
  },
  gearIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  profileMenuPopup: {
    position: 'absolute',
    bottom: 54,
    left: 8,
    right: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileMenuHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 2,
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  profileItemName: {
    fontSize: 12.5,
    flex: 1,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  profileActionText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  profileMenuSettingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  profileMenuSettingsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  inlineInput: {
    flex: 1,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
