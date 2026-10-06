import React, { useState } from 'react';
import { View, StyleSheet, Platform, LayoutAnimation, UIManager } from 'react-native';
import WelcomeSection from '../components/WelcomeSection';
import QuickActionCards from '../components/QuickActionCards';
import ChatInterface from '../components/ChatInterface';
import { sendChatMessage } from '../services/apiService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AIAssistant({ theme, isDesktop }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiConnectedStatus, setGeminiConnectedStatus] = useState(null);

  const handleSendText = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    const userMsg = { text, sender: 'user' };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: text,
        selectedDatasetId,
        conversationHistory: messages,
      });

      if (response.newSelectedDatasetId) {
        setSelectedDatasetId(response.newSelectedDatasetId);
      }

      setGeminiConnectedStatus(response.geminiConnected ?? false);

      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      setMessages(prev => [
        ...prev,
        {
          text: response.answer,
          sources: response.sources,
          modelUsed: response.modelUsed,
          sender: 'bot',
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setGeminiConnectedStatus(false);
      setMessages(prev => [
        ...prev,
        {
          text: 'AI analysis is temporarily unavailable. Please try again.',
          sources: ['System Notice'],
          sender: 'bot',
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSendText(question);
  };

  const hasMessages = messages.length > 0;

  return (
    <View style={styles.container}>
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
          ListHeaderComponent={!hasMessages ? () => (
            <View style={styles.welcomeContainer}>
              <WelcomeSection theme={theme} />
              <QuickActionCards theme={theme} onSelectQuestion={handleQuickQuestion} />
            </View>
          ) : null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatWrapper: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  }
});
