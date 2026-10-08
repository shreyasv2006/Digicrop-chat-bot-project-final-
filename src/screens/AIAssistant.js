import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import WelcomeSection from '../components/WelcomeSection';
import QuickActionCards from '../components/QuickActionCards';
import ChatInterface from '../components/ChatInterface';
import KnowledgeGroundingPane from '../components/KnowledgeGroundingPane';
import UploadDatasetModal from '../components/UploadDatasetModal';
import { sendChatMessage } from '../services/apiService';
import { getChat, saveChat } from '../services/chatStorage';
import { datasetService } from '../services/datasetService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AIAssistant({
  theme,
  isDesktop,
  activeChatId,
  onChatUpdated,
  rightPanelOpen = true,
  onCloseRightPanel,
  onOpenUploadModal,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiConnectedStatus, setGeminiConnectedStatus] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [draggedFile, setDraggedFile] = useState(null);

  const currentChatRef = useRef(null);

  // Load chat whenever activeChatId changes
  useEffect(() => {
    let isMounted = true;
    async function loadActiveChat() {
      if (!activeChatId) {
        currentChatRef.current = null;
        setMessages([]);
        setSelectedDatasetId('general');
        return;
      }
      try {
        const stored = await getChat(activeChatId);
        if (isMounted) {
          if (stored) {
            currentChatRef.current = stored;
            setMessages(stored.messages || []);

            // Check if selected dataset still exists; silently drop if deleted
            const allDatasets = datasetService.getAllDatasets();
            const validIds = new Set(['general', 'all', ...allDatasets.map((d) => d.id)]);
            const storedDatasetId = stored.selectedDatasetId || (stored.selectedDatasetIds?.[0]) || 'general';
            if (validIds.has(storedDatasetId)) {
              setSelectedDatasetId(storedDatasetId);
            } else {
              setSelectedDatasetId('general');
            }
          } else {
            currentChatRef.current = null;
            setMessages([]);
            setSelectedDatasetId('general');
          }
        }
      } catch (err) {
        console.warn('Error loading chat:', err);
      }
    }
    loadActiveChat();
    return () => {
      isMounted = false;
    };
  }, [activeChatId]);

  const handleSendText = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    const userMsg = { text, sender: 'user', timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Bind targeted chat ID for background safe completion
    let targetChat = currentChatRef.current;
    if (!targetChat) {
      // First message: optimistic creation of chat entry
      const newId = 'chat_' + Date.now() + Math.random().toString(36).substring(2, 6);
      const title = text.replace(/[\r\n]+/g, ' ').slice(0, 40).trim() || 'New conversation';
      targetChat = {
        id: newId,
        title: title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: updatedMessages,
        selectedDatasetId: selectedDatasetId,
        selectedDatasetIds: [selectedDatasetId],
      };
      currentChatRef.current = targetChat;

      try {
        await saveChat(targetChat);
        if (onChatUpdated) {
          onChatUpdated(targetChat);
        }
      } catch (err) {
        console.warn('Optimistic chat save warning:', err);
      }
    } else {
      targetChat = {
        ...targetChat,
        updatedAt: Date.now(),
        messages: updatedMessages,
      };
      currentChatRef.current = targetChat;
      try {
        await saveChat(targetChat);
        if (onChatUpdated) onChatUpdated(targetChat);
      } catch (err) {}
    }

    const boundChatId = targetChat.id;

    try {
      // Memory per chat: last 6-10 messages of this chat
      const historyToSend = messages.slice(-10);

      const response = await sendChatMessage({
        message: text,
        selectedDatasetId,
        conversationHistory: historyToSend,
      });

      if (response.newSelectedDatasetId) {
        setSelectedDatasetId(response.newSelectedDatasetId);
      }

      setGeminiConnectedStatus(response.geminiConnected ?? false);

      const botMsg = {
        text: response.answer,
        sources: response.sources,
        modelUsed: response.modelUsed,
        usage: response.usage,
        trace: response.trace,
        sender: 'bot',
        timestamp: Date.now(),
      };

      // Safely fetch latest version of target chat from storage
      const existingInStore = await getChat(boundChatId);
      const prevMsgs = existingInStore ? existingInStore.messages : updatedMessages;

      // Prevent duplicates
      const finalMsgs = [...prevMsgs];
      const hasBotMsg = finalMsgs.some(m => m.timestamp === botMsg.timestamp && m.sender === 'bot');
      if (!hasBotMsg) {
        finalMsgs.push(botMsg);
      }

      const finalChat = {
        ...(existingInStore || targetChat),
        updatedAt: Date.now(),
        messages: finalMsgs,
        selectedDatasetId: selectedDatasetId,
      };

      await saveChat(finalChat);

      // Only update screen state if user is still on this chat
      if (currentChatRef.current && currentChatRef.current.id === boundChatId) {
        currentChatRef.current = finalChat;
        setMessages(finalMsgs);
      }

      if (onChatUpdated) {
        onChatUpdated(finalChat);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setGeminiConnectedStatus(false);

      const errorMsg = {
        text: 'AI analysis is temporarily unavailable. Please try again.',
        sources: ['System Notice'],
        sender: 'bot',
        timestamp: Date.now(),
      };

      if (currentChatRef.current && currentChatRef.current.id === boundChatId) {
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSendText(question);
  };

  const openModalWithFile = (file) => {
    setDraggedFile(file);
    setModalVisible(true);
  };

  // Web drag-and-drop listener on container
  const handleDragOver = (e) => {
    if (Platform.OS === 'web') {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    if (Platform.OS === 'web') {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files?.[0]) {
        openModalWithFile(e.dataTransfer.files[0]);
      }
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <View
      style={styles.container}
      {...(Platform.OS === 'web'
        ? {
            onDragOver: handleDragOver,
            onDrop: handleDrop,
          }
        : {})}
    >
      <View style={styles.contentRow}>
        <View style={styles.chatWrapper}>
          <ChatInterface
            theme={theme}
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={() => handleSendText(inputText)}
            isDesktop={isDesktop}
            onQuickQuestionPress={handleQuickQuestion}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            isLoading={isLoading}
            geminiConnectedStatus={geminiConnectedStatus}
            onOpenUploadModal={() => {
              if (onOpenUploadModal) onOpenUploadModal();
              else setModalVisible(true);
            }}
            ListHeaderComponent={
              !hasMessages
                ? () => (
                    <View style={styles.welcomeContainer}>
                      <WelcomeSection theme={theme} />
                      <QuickActionCards theme={theme} onSelectQuestion={handleQuickQuestion} />
                    </View>
                  )
                : null
            }
          />
        </View>

        {/* Right Side Knowledge Grounding Pane: Persistent on Desktop (>=1100px), Overlay on Narrow (<1100px) */}
        {isDesktop && (
          <KnowledgeGroundingPane
            theme={theme}
            isOpen={rightPanelOpen}
            onDatasetChanged={() => datasetService.notifyListeners()}
          />
        )}
      </View>

      {/* Overlay Drawer for Right Knowledge Panel on Narrow Screens (<1100px) */}
      {!isDesktop && rightPanelOpen && (
        <View style={styles.rightOverlayWrapper}>
          <TouchableOpacity
            style={styles.rightBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (onCloseRightPanel) onCloseRightPanel();
            }}
          />
          <View style={styles.rightDrawerContent}>
            <KnowledgeGroundingPane
              theme={theme}
              isOpen={true}
              onDatasetChanged={() => datasetService.notifyListeners()}
            />
          </View>
        </View>
      )}

      <UploadDatasetModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setDraggedFile(null);
        }}
        initialFile={draggedFile}
        onDatasetAdded={(newDs) => {
          setSelectedDatasetId(newDs.id);
        }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  chatWrapper: {
    flex: 1,
  },
  welcomeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  rightOverlayWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 990,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rightBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  rightDrawerContent: {
    width: 280,
    height: '100%',
    zIndex: 995,
  },
});
