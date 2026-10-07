import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';
import Sidebar from './src/components/Sidebar';
import Header from './src/components/Header';
import AuditLogModal from './src/components/AuditLogModal';
import { injectWebFonts } from './src/utils/injectWebFonts';
import datasetService from './src/services/datasetService';

// Import Screens
import DashboardOverview from './src/screens/DashboardOverview';
import AIAssistant from './src/screens/AIAssistant';
import CropHealth from './src/screens/CropHealth';
import WeatherInsights from './src/screens/WeatherInsights';
import SoilAnalysis from './src/screens/SoilAnalysis';
import VegetationIndices from './src/screens/VegetationIndices';
import SavedConversations from './src/screens/SavedConversations';
import Settings from './src/screens/Settings';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('AI Assistant');
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [sessionResetTrigger, setSessionResetTrigger] = useState(0);

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
  });

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // Tablet/Desktop breakpoint
  
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    injectWebFonts();
  }, []);


  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleNewSession = () => {
    setSessionResetTrigger(prev => prev + 1);
    setCurrentScreen('AI Assistant');
  };

  const handleSyncLiveData = () => {
    datasetService.notifyListeners();
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardOverview theme={theme} onNavigate={setCurrentScreen} isDesktop={isDesktop} />;
      case 'AI Assistant':
        return <AIAssistant theme={theme} isDesktop={isDesktop} sessionResetTrigger={sessionResetTrigger} />;
      case 'Crop Health':
        return <CropHealth theme={theme} onNavigate={setCurrentScreen} />;
      case 'Weather Insights':
        return <WeatherInsights theme={theme} />;
      case 'Soil Analysis':
        return <SoilAnalysis theme={theme} />;
      case 'Vegetation Indices':
        return <VegetationIndices theme={theme} />;
      case 'Saved':
        return <SavedConversations theme={theme} onNavigate={setCurrentScreen} />;
      case 'Settings':
        return <Settings theme={theme} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
      default:
        return <AIAssistant theme={theme} isDesktop={isDesktop} sessionResetTrigger={sessionResetTrigger} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          {isDesktop && (
            <Sidebar 
              theme={theme} 
              isDesktop={isDesktop} 
              currentScreen={currentScreen}
              onSelectScreen={setCurrentScreen}
            />
          )}
          {!isDesktop && sidebarOpen && (
            <Sidebar 
              theme={theme} 
              isDesktop={false} 
              closeSidebar={() => setSidebarOpen(false)} 
              currentScreen={currentScreen}
              onSelectScreen={setCurrentScreen}
            />
          )}
          
          <View style={styles.main}>
            <Header 
              theme={theme} 
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              toggleSidebar={toggleSidebar}
              isDesktop={isDesktop}
              title={currentScreen}
              onNewSession={handleNewSession}
              onSyncLiveData={handleSyncLiveData}
              onOpenAuditLog={() => setAuditModalVisible(true)}
            />
            <View style={styles.screenWrapper}>
              {renderScreen()}
            </View>
          </View>
        </View>

        <AuditLogModal 
          visible={auditModalVisible}
          onClose={() => setAuditModalVisible(false)}
          theme={theme}
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
    overflow: 'hidden',
  },
  screenWrapper: {
    flex: 1,
  }
});
