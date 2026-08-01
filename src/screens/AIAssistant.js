import React, { useState } from 'react';
import { View, StyleSheet, Platform, LayoutAnimation, UIManager } from 'react-native';
import WelcomeSection from '../components/WelcomeSection';
import QuickActionCards from '../components/QuickActionCards';
import ChatInterface from '../components/ChatInterface';
import { PREDEFINED_RESPONSES } from '../constants/data';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AIAssistant({ theme, isDesktop }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Add user message
    const newMessages = [...messages, { text, sender: 'user' }];
    setMessages(newMessages);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse = "I'm sorry, I don't have information on that topic yet. Could you ask about NDVI, Water Stress, or Soil Moisture?";
      
      // Check for exact matches in predefined responses
      if (PREDEFINED_RESPONSES[text]) {
        botResponse = PREDEFINED_RESPONSES[text];
      } else {
        // Simple keyword matching as fallback
        const lowerText = text.toLowerCase();
        if (lowerText.includes('ndvi')) botResponse = PREDEFINED_RESPONSES['What is NDVI?'];
        else if (lowerText.includes('ndre')) botResponse = PREDEFINED_RESPONSES['What is NDRE?'];
        else if (lowerText.includes('ndwi')) botResponse = PREDEFINED_RESPONSES['What is NDWI?'];
        else if (lowerText.includes('water stress')) botResponse = PREDEFINED_RESPONSES['What is Water Stress?'];
        else if (lowerText.includes('soil moisture')) botResponse = PREDEFINED_RESPONSES['What is Soil Moisture?'];
        else if (lowerText.includes('gdd')) botResponse = PREDEFINED_RESPONSES['What is GDD?'];
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    }, 600); // Small delay to feel natural
  };

  const handleQuickQuestion = (question) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Add user message
    const newMessages = [...messages, { text: question, sender: 'user' }];
    setMessages(newMessages);
    
    // Auto respond
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const botResponse = PREDEFINED_RESPONSES[question];
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    }, 600);
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
          onSendMessage={handleSend}
          isDesktop={isDesktop}
          onQuickQuestionPress={handleQuickQuestion}
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
    paddingBottom: 40,
  }
});
