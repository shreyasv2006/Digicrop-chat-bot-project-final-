import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QUICK_QUESTIONS } from '../constants/data';
import MarkdownText from './MarkdownText';
import UploadDatasetModal from './UploadDatasetModal';
import { datasetService } from '../services/datasetService';

export default function ChatInterface({
  theme,
  messages,
  inputText,
  setInputText,
  onSendMessage,
  isDesktop,
  ListHeaderComponent,
  onQuickQuestionPress,
  selectedDatasetId,
  onSelectDataset,
  isLoading,
  onUploadDatasetSuccess,
  geminiConnectedStatus,
}) {
  const scrollViewRef = useRef();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [datasetOptions, setDatasetOptions] = useState([]);

  useEffect(() => {
    setDatasetOptions(datasetService.getDatasetSelectorOptions());
  }, [selectedDatasetId]);

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const activeDatasetObj = datasetOptions.find(opt => opt.id === selectedDatasetId) || datasetOptions[0];

  const handleDatasetAdded = (newDataset) => {
    setDatasetOptions(datasetService.getDatasetSelectorOptions());
    if (onSelectDataset) onSelectDataset(newDataset.id);
    if (onUploadDatasetSuccess) onUploadDatasetSuccess(newDataset);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Diagnostic & Dataset Selector Bar */}
      <View style={[styles.datasetSelectorBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        
        {/* Diagnostic Status Indicator */}
        <View style={styles.diagnosticRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: geminiConnectedStatus === true ? '#10B98115' : '#EF444415', borderColor: geminiConnectedStatus === true ? '#10B981' : '#EF4444' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: geminiConnectedStatus === true ? '#10B981' : '#EF4444' }
            ]} />
            <Text style={[
              styles.statusText,
              { color: geminiConnectedStatus === true ? '#047857' : '#B91C1C' }
            ]}>
              Gemini API: {geminiConnectedStatus === true ? 'CONNECTED' : 'NOT CONNECTED'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.uploadBtnText, { color: theme.primary }]}>+ Add .md Dataset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectorHeaderRow}>
          <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>
            KNOWLEDGE DATASET CONTEXT:
          </Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datasetHorizontalScroll}
        >
          {datasetOptions.map((opt) => {
            const isActive = selectedDatasetId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.datasetPill,
                  { 
                    backgroundColor: isActive ? theme.primary : theme.background,
                    borderColor: isActive ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => onSelectDataset && onSelectDataset(opt.id)}
              >
                <Text style={[
                  styles.datasetPillText,
                  { color: isActive ? '#FFFFFF' : theme.text, fontWeight: isActive ? '700' : '500' }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Context Banner */}
      {selectedDatasetId && selectedDatasetId !== 'general' && activeDatasetObj && (
        <View style={[styles.activeBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.activeBannerText, { color: theme.text }]}>
            Using Context: <Text style={{ fontWeight: 'bold' }}>{activeDatasetObj.label}</Text>
          </Text>
          <TouchableOpacity onPress={() => onSelectDataset('general')} style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Switch to General AI</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages Scroll Area */}
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
                isUser 
                  ? [styles.userBubble, { backgroundColor: theme.primary }] 
                  : [styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border }]
              ]}>
                {isUser ? (
                  <Text style={[styles.messageText, { color: '#FFF' }]}>
                    {msg.text}
                  </Text>
                ) : (
                  <View style={{ width: '100%' }}>
                    <MarkdownText content={msg.text} textColor={theme.text} theme={theme} />
                    
                    {/* Source Transparency Indicator */}
                    {msg.sources && msg.sources.length > 0 && (
                      <View style={[styles.sourceBadgeContainer, { borderTopColor: theme.border }]}>
                        <Ionicons name="compass-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.sourceBadgeText, { color: theme.textSecondary }]}>
                          Source: <Text style={{ fontWeight: '600', color: theme.text }}>{msg.sources.join(', ')}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowBot]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Ionicons name="leaf" size={16} color="#FFF" />
            </View>
            <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={{ color: theme.textSecondary, fontSize: 14, fontStyle: 'italic' }}>
                  DigiCrop AI is generating response from Gemini Flash...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Questions Quick Horizontal Bar */}
      {messages.length > 0 && (
        <View style={[styles.quickQuestionsContainer, { borderTopColor: theme.border }]}>
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

      {/* Input Box Bar */}
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, SIZES.md) : SIZES.md
        }
      ]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.attachButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="document-attach-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Ask DigiCrop AI (e.g. 'What is NDVI?' or 'Answer from F001 Farm Dataset: what is soil moisture?')"
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={onSendMessage}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              { backgroundColor: inputText.trim().length > 0 && !isLoading ? theme.primary : theme.border }
            ]}
            onPress={onSendMessage}
            disabled={inputText.trim().length === 0 || isLoading}
          >
            <Ionicons name="send" size={18} color="#FFF" style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dataset Upload Modal */}
      <UploadDatasetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onDatasetAdded={handleDatasetAdded}
        theme={theme}
      />
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
  datasetSelectorBar: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderBottomWidth: 1,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  datasetHorizontalScroll: {
    paddingVertical: 2,
  },
  datasetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  datasetPillText: {
    fontSize: 12,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  activeBannerText: {
    fontSize: 13,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '85%',
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
  sourceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 12,
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
    fontSize: 15,
    paddingHorizontal: SIZES.sm,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
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
    marginLeft: 2,
  },
  quickQuestionsContainer: {
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
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
    fontSize: 13,
    fontWeight: '500',
  }
});
