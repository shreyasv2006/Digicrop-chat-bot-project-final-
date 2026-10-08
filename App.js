import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';
import Sidebar from './src/components/Sidebar';
import Header from './src/components/Header';
import { injectWebFonts } from './src/utils/injectWebFonts';
import datasetService from './src/services/datasetService';
import {
  getAllChats,
  saveChat,
  deleteChat,
  toggleStarChat,
  togglePinChat,
  migrateFromLocalStorage,
  getProfiles,
  getActiveProfileId,
  getActiveProfile,
  setActiveProfileId,
  createProfile,
  renameProfile,
  deleteProfile,
} from './src/services/chatStorage';

// Import Screens
import DashboardOverview from './src/screens/DashboardOverview';
import AIAssistant from './src/screens/AIAssistant';
import CropHealth from './src/screens/CropHealth';
import WeatherInsights from './src/screens/WeatherInsights';
import SoilAnalysis from './src/screens/SoilAnalysis';
import VegetationIndices from './src/screens/VegetationIndices';
import AgentMonitor from './src/screens/AgentMonitor';
import SavedConversations from './src/screens/SavedConversations';
import Settings from './src/screens/Settings';

import ErrorBoundary from './src/components/ErrorBoundary';
import UploadDatasetModal from './src/components/UploadDatasetModal';

const SIDEBAR_PREF_KEY = 'digicrop_sidebar_collapsed';
const RIGHT_PANEL_PREF_KEY = 'digicrop_right_panel_open';

export default function App() {
  const { width } = useWindowDimensions();

  // Breakpoints per Change 3:
  // >= 1100px: persistent sidebar
  // 700 - 1099px: rail (~64px) by default, expanding as overlay on top
  // < 700px: fully hidden by default, opening as ~300px drawer overlay
  const isLargeDesktop = width >= 1100;
  const isMediumTablet = width >= 700 && width < 1100;
  const isSmallMobile = width < 700;

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('AI Assistant');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Profiles State
  const [profiles, setProfiles] = useState(() => getProfiles());
  const [activeProfileIdState, setActiveProfileIdState] = useState(() => getActiveProfileId());

  // Persistent sidebar collapse state (for >=1100px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(SIDEBAR_PREF_KEY);
      if (stored !== null) return stored === 'true';
    }
    return false;
  });

  // Persistent right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(RIGHT_PANEL_PREF_KEY);
      if (stored !== null) return stored === 'true';
    }
    return width >= 1100;
  });

  // Drawer Overlay state (for < 1100px)
  const [overlayDrawerOpen, setOverlayDrawerOpen] = useState(false);

  // Touch Swipe-Left handling for closing mobile drawer
  const touchStartXRef = useRef(0);

  // Lock body scroll while overlay drawer is open on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (overlayDrawerOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }, [overlayDrawerOpen]);

  // Chats state (Stored in IndexedDB)
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
  });

  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  const reloadChats = useCallback(async (profId) => {
    try {
      const targetProfId = profId || activeProfileIdState;
      const list = await getAllChats(targetProfId);
      setChats(list || []);
    } catch (e) {
      console.warn('Failed to load chats:', e);
    }
  }, [activeProfileIdState]);

  useEffect(() => {
    injectWebFonts();
    migrateFromLocalStorage().then(() => {
      setProfiles(getProfiles());
      setActiveProfileIdState(getActiveProfileId());
      reloadChats(getActiveProfileId());
    });
  }, [reloadChats]);

  // Sidebar Toggle logic based on Breakpoints
  const toggleSidebar = () => {
    if (isLargeDesktop) {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(SIDEBAR_PREF_KEY, String(next));
          }
        } catch (e) {}
        return next;
      });
    } else {
      // 700-1099px or < 700px: open/close overlay drawer
      setOverlayDrawerOpen((prev) => !prev);
    }
  };

  const toggleRightPanel = () => {
    setRightPanelOpen((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(RIGHT_PANEL_PREF_KEY, String(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Keyboard shortcut Ctrl/Cmd+B & Esc listener
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleSidebar();
        }
        if (e.key === 'Escape') {
          if (overlayDrawerOpen) {
            setOverlayDrawerOpen(false);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLargeDesktop, overlayDrawerOpen]);

  // Touch Swipe-Left on overlay drawer
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartXRef.current - touchEndX > 50) {
        // Swiped left -> Close drawer
        setOverlayDrawerOpen(false);
      }
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleNewChat = () => {
    setActiveChatId(null);
    setCurrentScreen('AI Assistant');
    if (overlayDrawerOpen) setOverlayDrawerOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setCurrentScreen('AI Assistant');
    if (overlayDrawerOpen) setOverlayDrawerOpen(false);
  };

  const handleRenameChat = async (id, newTitle) => {
    const target = chats.find((c) => c.id === id);
    if (target) {
      const updated = { ...target, title: newTitle, updatedAt: Date.now() };
      await saveChat(updated);
      reloadChats();
    }
  };

  const handleDeleteChat = async (id) => {
    await deleteChat(id);
    if (activeChatId === id) {
      setActiveChatId(null);
    }
    reloadChats();
  };

  const handleToggleStarChat = async (id) => {
    await toggleStarChat(id);
    reloadChats();
  };

  const handleTogglePinChat = async (id) => {
    await togglePinChat(id);
    reloadChats();
  };

  const handleChatUpdated = (updatedChat) => {
    if (updatedChat && updatedChat.id) {
      setActiveChatId(updatedChat.id);
      reloadChats();
    }
  };

  // Profile management handlers
  const handleSelectProfile = (id) => {
    setActiveProfileId(id);
    setActiveProfileIdState(id);
    setActiveChatId(null); // Fresh empty chat immediately
    reloadChats(id);
    setCurrentScreen('AI Assistant');
    if (overlayDrawerOpen) setOverlayDrawerOpen(false);
  };

  const handleCreateProfile = (name) => {
    const newP = createProfile(name);
    setProfiles(getProfiles());
    setActiveProfileIdState(newP.id);
    setActiveChatId(null);
    reloadChats(newP.id);
    setCurrentScreen('AI Assistant');
    if (overlayDrawerOpen) setOverlayDrawerOpen(false);
  };

  const handleRenameProfile = (id, newName) => {
    renameProfile(id, newName);
    setProfiles(getProfiles());
  };

  const handleDeleteProfile = async (id) => {
    try {
      const remainingActive = await deleteProfile(id);
      setProfiles(getProfiles());
      if (remainingActive) {
        setActiveProfileIdState(remainingActive.id);
        setActiveChatId(null);
        reloadChats(remainingActive.id);
      }
    } catch (err) {
      alert(err.message || 'Could not delete profile.');
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileIdState) || profiles[0] || { name: 'User' };
  const activeChat = chats.find((c) => c.id === activeChatId);
  const currentChatTitle = activeChat ? activeChat.title : 'New chat';

  const openUploadModal = () => setUploadModalVisible(true);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return (
          <DashboardOverview
            theme={theme}
            onNavigate={setCurrentScreen}
            isDesktop={isLargeDesktop}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'AI Assistant':
        return (
          <AIAssistant
            theme={theme}
            isDesktop={isLargeDesktop}
            activeChatId={activeChatId}
            onChatUpdated={handleChatUpdated}
            rightPanelOpen={rightPanelOpen}
            onCloseRightPanel={() => setRightPanelOpen(false)}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'Crop Health':
        return (
          <CropHealth
            theme={theme}
            onNavigate={setCurrentScreen}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'Weather Insights':
        return (
          <WeatherInsights
            theme={theme}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'Soil Analysis':
        return (
          <SoilAnalysis
            theme={theme}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'Vegetation Indices':
        return (
          <VegetationIndices
            theme={theme}
            onOpenUploadModal={openUploadModal}
          />
        );
      case 'Agent Monitor':
        return <AgentMonitor theme={theme} />;
      case 'Saved':
        return <SavedConversations theme={theme} onNavigate={setCurrentScreen} />;
      case 'Settings':
        return (
          <Settings
            theme={theme}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            onOpenUploadModal={openUploadModal}
            activeProfile={activeProfile}
            onResetApp={() => {
              setActiveChatId(null);
              reloadChats();
              setCurrentScreen('AI Assistant');
            }}
            onChatsCleared={() => {
              setActiveChatId(null);
              reloadChats();
            }}
          />
        );
      default:
        return (
          <AIAssistant
            theme={theme}
            isDesktop={isLargeDesktop}
            activeChatId={activeChatId}
            onChatUpdated={handleChatUpdated}
            rightPanelOpen={rightPanelOpen}
            onCloseRightPanel={() => setRightPanelOpen(false)}
            onOpenUploadModal={openUploadModal}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          {/* Breakpoint 1: Persistent sidebar >= 1100px (Expanded ~280px or Rail ~64px) */}
          {isLargeDesktop && (
            <Sidebar
              theme={theme}
              isDesktop={true}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              currentScreen={currentScreen}
              onSelectScreen={(screen) => {
                setCurrentScreen(screen);
              }}
              onNewChat={handleNewChat}
              onOpenUploadModal={openUploadModal}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              onToggleStarChat={handleToggleStarChat}
              onTogglePinChat={handleTogglePinChat}
              profiles={profiles}
              activeProfile={activeProfile}
              onSelectProfile={handleSelectProfile}
              onCreateProfile={handleCreateProfile}
              onRenameProfile={handleRenameProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          )}

          {/* Breakpoint 2: Medium Tablet (700-1099px) Rail by Default */}
          {isMediumTablet && !overlayDrawerOpen && (
            <Sidebar
              theme={theme}
              isDesktop={true}
              isCollapsed={true}
              onToggleCollapse={toggleSidebar}
              currentScreen={currentScreen}
              onSelectScreen={(screen) => {
                setCurrentScreen(screen);
              }}
              onNewChat={handleNewChat}
              onOpenUploadModal={openUploadModal}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              onToggleStarChat={handleToggleStarChat}
              onTogglePinChat={handleTogglePinChat}
              profiles={profiles}
              activeProfile={activeProfile}
              onSelectProfile={handleSelectProfile}
              onCreateProfile={handleCreateProfile}
              onRenameProfile={handleRenameProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          )}

          {/* Breakpoint 2 & 3 Overlay Drawer Mode (< 1100px when opened) */}
          {!isLargeDesktop && overlayDrawerOpen && (
            <View
              style={styles.mobileOverlayWrapper}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={() => setOverlayDrawerOpen(false)}
              />
              <Sidebar
                theme={theme}
                isDesktop={false}
                isCollapsed={false}
                closeSidebar={() => setOverlayDrawerOpen(false)}
                currentScreen={currentScreen}
                onSelectScreen={(screen) => {
                  setCurrentScreen(screen);
                  setOverlayDrawerOpen(false);
                }}
                onNewChat={handleNewChat}
                onOpenUploadModal={openUploadModal}
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={handleSelectChat}
                onRenameChat={handleRenameChat}
                onDeleteChat={handleDeleteChat}
                onToggleStarChat={handleToggleStarChat}
                onTogglePinChat={handleTogglePinChat}
                profiles={profiles}
                activeProfile={activeProfile}
                onSelectProfile={handleSelectProfile}
                onCreateProfile={handleCreateProfile}
                onRenameProfile={handleRenameProfile}
                onDeleteProfile={handleDeleteProfile}
              />
            </View>
          )}

          {/* Main Content Area */}
          <View style={styles.main}>
            <Header
              theme={theme}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              toggleSidebar={toggleSidebar}
              sidebarCollapsed={isLargeDesktop ? sidebarCollapsed : !overlayDrawerOpen}
              isDesktop={isLargeDesktop}
              chatTitle={currentChatTitle}
              onRenameChat={(newTitle) => {
                if (activeChatId) handleRenameChat(activeChatId, newTitle);
              }}
              toggleRightPanel={toggleRightPanel}
              rightPanelOpen={rightPanelOpen}
              currentScreen={currentScreen}
            />
            <View style={styles.screenWrapper}>
              <ErrorBoundary theme={theme} key={currentScreen}>
                {renderScreen()}
              </ErrorBoundary>
            </View>
          </View>
        </View>

        {/* Global Add Dataset Modal */}
        <UploadDatasetModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          theme={theme}
          onDatasetAdded={(newDs) => {
            datasetService.notifyListeners();
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  screenWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  mobileOverlayWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
});
