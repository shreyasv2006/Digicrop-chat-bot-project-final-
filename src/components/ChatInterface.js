import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import DCLogo from './DCLogo';
import MarkdownText from './MarkdownText';
import { datasetService } from '../services/datasetService';
import { saveConversationToStorage } from '../services/datasetData';
import { showToast } from '../services/dialogService';

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
  geminiConnectedStatus,
  onOpenUploadModal,
}) {
  const scrollViewRef = useRef();
  const textareaRef = useRef();
  const [datasetOptions, setDatasetOptions] = useState([]);
  const [allDatasetsCount, setAllDatasetsCount] = useState(0);

  const refreshDatasetInfo = () => {
    const opts = datasetService.getDatasetSelectorOptions();
    const allDs = datasetService.getAllDatasets();
    setDatasetOptions(opts);
    setAllDatasetsCount(allDs.length);
  };

  useEffect(() => {
    refreshDatasetInfo();
  }, [selectedDatasetId, messages]);

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  // Web keyboard handler: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
        onSendMessage();
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          !hasMessages && { flexGrow: 1, justifyContent: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredColumn}>
          {ListHeaderComponent && <ListHeaderComponent />}

          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowBot,
                ]}
              >
                {!isUser ? (
                  /* Assistant message: plain text with markdown, no heavy card */
                  <View style={styles.botMessageContainer}>
                    <View style={styles.botHeaderRow}>
                      <View
                        style={[
                          styles.avatarBot,
                          { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' },
                        ]}
                      >
                        <DCLogo size={18} theme={theme} />
                      </View>
                      <Text style={[styles.botName, { color: theme.text }]}>DigiCrop AI</Text>
                      {msg.modelUsed && (
                        <Text style={[styles.modelBadge, { color: theme.textSecondary }]}>
                          {msg.modelUsed}
                        </Text>
                      )}
                    </View>

                    <View style={styles.botBody}>
                      <MarkdownText content={msg.text} textColor={theme.text} theme={theme} />
                    </View>

                    {/* Sources Line */}
                    {msg.sources && msg.sources.length > 0 && (
                      <View style={[styles.sourceLine, { borderTopColor: theme.border }]}>
                        <View style={styles.flexRow}>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={13}
                            color={theme.primary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.sourceText, { color: theme.textSecondary }]}>
                            Sources:{' '}
                            <Text style={{ fontWeight: '600', color: theme.text }}>
                              {msg.sources.join(', ')}
                            </Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={() => {
                            saveConversationToStorage({
                              title: messages[index - 1] ? messages[index - 1].text : 'Saved Answer',
                              desc: msg.text,
                            });
                            showToast('Answer saved! View in the Saved tab.', 'success');
                          }}

                        >
                          <Ionicons
                            name="bookmark-outline"
                            size={12}
                            color={theme.primary}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.saveBtnText, { color: theme.primary }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Token Usage Line */}
                    <View style={styles.tokenLineContainer}>
                      <Text style={[styles.tokenLineText, { color: theme.textSecondary }]}>
                        {(() => {
                          const u = msg.usage;
                          if (!u || u.calledModel === false) {
                            return 'No model call · 0 tokens';
                          }
                          const q = u.questionTokens != null ? u.questionTokens : 'n/a';
                          const p =
                            u.promptTokens != null
                              ? u.promptTokens
                              : u.inputTokens != null
                              ? u.inputTokens
                              : 'n/a';
                          const o =
                            (u.completionTokens != null
                              ? u.completionTokens
                              : u.outputTokens != null
                              ? u.outputTokens
                              : 0) + (u.thinkingTokens || 0);
                          const tot = u.totalTokens != null ? u.totalTokens : 'n/a';
                          const lat = u.latencyMs ? `${(u.latencyMs / 1000).toFixed(1)}s` : 'n/a';
                          return `Question ${q} · Prompt ${p} · Output ${o} · Total ${tot} tokens · ${lat}`;
                        })()}
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* User message: subtle right-aligned bubble */
                  <View
                    style={[
                      styles.userBubble,
                      { backgroundColor: theme.cardBg, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.userText, { color: theme.text }]}>{msg.text}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Loading state */}
          {isLoading && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={styles.botMessageContainer}>
                <View style={styles.botHeaderRow}>
                  <View
                    style={[
                      styles.avatarBot,
                      { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' },
                    ]}
                  >
                    <DCLogo size={18} theme={theme} />
                  </View>
                  <Text style={[styles.botName, { color: theme.text }]}>DigiCrop AI</Text>
                </View>
                <View style={[styles.flexRow, { paddingVertical: 8 }]}>
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                    Thinking and analyzing agronomic context...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Centered Composer Area */}
      <View style={[styles.composerContainer, { backgroundColor: theme.background }]}>
        <View style={styles.composerWrapper}>
          {/* Compact Knowledge Dataset Selector Bar (Above composer) */}
          <View style={styles.datasetChipsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datasetChipsScroll}
            >
              <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Context:</Text>
              {datasetOptions.map((opt) => {
                const isActive = selectedDatasetId === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.contextChip,
                      {
                        backgroundColor: isActive ? theme.primary : theme.surface,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => onSelectDataset && onSelectDataset(opt.id)}
                  >
                    <Text
                      style={[
                        styles.contextChipText,
                        {
                          color: isActive ? '#FFFFFF' : theme.textSecondary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Claude-style Centered Rounded Composer Box */}
          <View
            style={[
              styles.composerBox,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Paperclip on the left (opens Add Dataset modal) */}
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={onOpenUploadModal}
              title="Add or Attach Dataset (.csv, .md, .txt, images, PDF)"
            >
              <Feather name="paperclip" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Auto-growing Textarea */}
            <TextInput
              ref={textareaRef}
              style={[
                styles.composerInput,
                { color: theme.text },
                Platform.OS === 'web' && { outlineStyle: 'none' },
              ]}
              placeholder="Ask anything about crops, soil, weather, or datasets..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              onKeyPress={Platform.OS === 'web' ? handleKeyDown : undefined}
            />

            {/* Round Send Button on the right */}
            <TouchableOpacity
              style={[
                styles.roundSendBtn,
                {
                  backgroundColor:
                    inputText.trim().length > 0 && !isLoading ? theme.primary : theme.border,
                },
              ]}
              onPress={onSendMessage}
              disabled={inputText.trim().length === 0 || isLoading}
              title="Send (Enter)"
            >
              <Feather
                name="arrow-up"
                size={16}
                color={inputText.trim().length > 0 && !isLoading ? '#FFFFFF' : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Bottom subtle hint */}
          <Text style={[styles.composerHint, { color: theme.textSecondary }]}>
            DigiCrop AI can make mistakes. Verify critical agronomy actions with certified advisers.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160, // Space for the fixed composer
    alignItems: 'center',
  },
  centeredColumn: {
    width: '100%',
    maxWidth: 760, // Claude.ai ~760px column
  },
  messageRow: {
    marginBottom: 20,
    width: '100%',
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowBot: {
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  userText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  botMessageContainer: {
    width: '100%',
    paddingVertical: 2,
  },
  botHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarBot: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  botName: {
    fontSize: 13,
    fontWeight: '700',
  },
  modelBadge: {
    fontSize: 11,
    marginLeft: 8,
    opacity: 0.6,
  },
  botBody: {
    width: '100%',
    marginTop: 2,
    marginBottom: 6,
  },
  sourceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 11,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tokenLineContainer: {
    marginTop: 4,
  },
  tokenLineText: {
    fontSize: 11,
    opacity: 0.75,
  },
  composerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 6,
    alignItems: 'center',
    zIndex: 20,
  },
  composerWrapper: {
    width: '100%',
    maxWidth: 760,
  },
  datasetChipsRow: {
    marginBottom: 6,
  },
  datasetChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  contextChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  contextChipText: {
    fontSize: 11.5,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 52,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  composerInput: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxHeight: 140,
  },
  roundSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 6,
  },
  composerHint: {
    textAlign: 'center',
    fontSize: 10.5,
    marginTop: 6,
    opacity: 0.65,
  },
});
