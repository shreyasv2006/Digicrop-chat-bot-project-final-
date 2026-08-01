import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QUICK_QUESTIONS } from '../constants/data';

export default function ChatInterface({ theme, messages, inputText, setInputText, onSendMessage, isDesktop, ListHeaderComponent, onQuickQuestionPress }) {
  const scrollViewRef = useRef();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Auto scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageListContent,
          messages.length === 0 && { flexGrow: 1, justifyContent: 'flex-end' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ListHeaderComponent && <ListHeaderComponent />}
        
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <View 
              key={index} 
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowBot
              ]}
            >
              {!isUser && (
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Ionicons name="leaf" size={16} color="#FFF" />
                </View>
              )}
              
              <View style={[
                styles.messageBubble,
                isUser ? [styles.userBubble, { backgroundColor: theme.primary }] : [styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border }]
              ]}>
                <Text style={[
                  styles.messageText,
                  { color: isUser ? '#FFF' : theme.text }
                ]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {messages.length > 0 && (
        <View style={styles.quickQuestionsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickQuestionsHorizontalContent}
          >
            {QUICK_QUESTIONS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.quickQuestionPill, 
                  { backgroundColor: theme.surface, borderColor: theme.border }
                ]}
                onPress={() => onQuickQuestionPress && onQuickQuestionPress(item.question)}
              >
                <Text style={[styles.quickQuestionPillText, { color: theme.text }]}>
                  {item.question}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, SIZES.md) : SIZES.md
        }
      ]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Ask anything about crops, soil, weather, or vegetation..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={onSendMessage}
          />
          
          {inputText.length === 0 ? (
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={onSendMessage}
            >
              <Ionicons name="send" size={18} color="#FFF" style={styles.sendIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SIZES.lg,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  userBubble: {
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    borderBottomLeftRadius: SIZES.radiusLg,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    borderBottomRightRadius: SIZES.radiusLg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  inputContainer: {
    padding: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 6,
    minHeight: 56,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: SIZES.sm,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
  },
  voiceButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.xs,
  },
  sendIcon: {
    marginLeft: 2, // optical alignment
  },
  quickQuestionsContainer: {
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: 'transparent', // Will be dynamic if needed, or left subtle
  },
  quickQuestionsHorizontalContent: {
    paddingHorizontal: SIZES.lg,
    flexDirection: 'row',
  },
  quickQuestionPill: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: SIZES.sm,
  },
  quickQuestionPillText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
