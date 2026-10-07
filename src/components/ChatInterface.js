import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  geminiConnectedStatus,
  onOpenUploadModal,
}) {
  const scrollViewRef = useRef();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [datasetOptions, setDatasetOptions] = useState([]);
  const [allDatasetsCount, setAllDatasetsCount] = useState(0);
  const [totalChunksCount, setTotalChunksCount] = useState(0);

  const refreshDatasetInfo = () => {
    const opts = datasetService.getDatasetSelectorOptions();
    const allDs = datasetService.getAllDatasets();
    setDatasetOptions(opts);
    setAllDatasetsCount(allDs.length);

    let totalChunks = 0;
    allDs.forEach(d => {
      totalChunks += (d.chunkCount || 1);
    });
    setTotalChunksCount(totalChunks);
  };

  useEffect(() => {
    refreshDatasetInfo();
  }, [selectedDatasetId, messages]);

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const handleDatasetAdded = (newDataset) => {
    refreshDatasetInfo();
    if (onSelectDataset) onSelectDataset(newDataset.id);
  };

  const isGroundingActive = selectedDatasetId && selectedDatasetId !== 'general';

  // Dynamic Quick Queries based on loaded data
  const farmIds = datasetService.getLoadedFarmIds();
  const quickQueries = [];
  if (farmIds.includes('F001')) {
    quickQueries.push('What is the NDVI of F001?');
    quickQueries.push('What is the soil moisture of F001?');
  }
  if (farmIds.includes('F004')) {
    quickQueries.push('What is the status of F004?');
  }
  if (farmIds.includes('F001') && farmIds.includes('F004')) {
    quickQueries.push('Compare F001 and F004 using their datasets.');
  }
  quickQueries.push('How does NDVI work?');
  quickQueries.push('Best irrigation tips');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Knowledge Dataset Context Bar */}
      <View style={[styles.datasetSelectorBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.selectorHeaderRow}>
          <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>
            KNOWLEDGE DATASET CONTEXT:
          </Text>

          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.uploadBtnText, { color: theme.primary }]}>+ Add Dataset</Text>
          </TouchableOpacity>
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
                    backgroundColor: isActive ? theme.primary : theme.cardBg,
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

      {/* Messages Scroll Feed */}
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
                <View style={[styles.avatarBot, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
                  <Ionicons name="hardware-chip-outline" size={18} color={theme.primary} />
                </View>
              )}
              
              <View style={[
                styles.messageBubble,
                isUser 
                  ? [styles.userBubble, { backgroundColor: theme.cardBg, borderColor: theme.primary + '40' }] 
                  : [styles.botBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]
              ]}>
                {isUser ? (
                  <View style={{ width: '100%' }}>
                    <View style={styles.userMetaRow}>
                      <Text style={[styles.userMetaText, { color: theme.primary }]}>AGRICULTURAL OFFICER</Text>
                    </View>
                    <Text style={[styles.messageText, { color: theme.text }]}>
                      {msg.text}
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <MarkdownText content={msg.text} textColor={theme.text} theme={theme} />
                    
                    {/* Source Attribution Line */}
                    {msg.sources && msg.sources.length > 0 && (
                      <View style={[styles.sourceBadgeContainer, { borderTopColor: theme.border }]}>
                        <View style={styles.flexRow}>
                          <Ionicons name="shield-checkmark-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.sourceBadgeText, { color: theme.textSecondary }]}>
                            Source: <Text style={{ fontWeight: '600', color: theme.text }}>{msg.sources.join(', ')}</Text>
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {isUser && (
                <View style={[styles.avatarUser, { backgroundColor: theme.primary + '25', borderColor: theme.primary + '50' }]}>
                  <Text style={[styles.avatarUserText, { color: theme.primary }]}>AO</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowBot]}>
            <View style={[styles.avatarBot, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
              <Ionicons name="hardware-chip-outline" size={18} color={theme.primary} />
            </View>
            <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.cardBg, borderColor: theme.border, paddingVertical: 12 }]}>
              <View style={styles.flexRow}>
                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                  DigiCrop AI is analyzing dataset context...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Queries Horizontal Bar */}
      <View style={[styles.quickQuestionsContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickQuestionsHorizontalContent}
        >
          <Text style={[styles.quickLabel, { color: theme.textSecondary }]}>QUICK QUERIES:</Text>
          {quickQueries.slice(0, 5).map((qText, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.quickQuestionPill, 
                { backgroundColor: theme.cardBg, borderColor: theme.border }
              ]}
              onPress={() => onQuickQuestionPress && onQuickQuestionPress(qText)}
            >
              <Text style={[styles.quickQuestionPillText, { color: theme.text }]}>
                {qText}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Box Bar */}
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, SIZES.sm) : SIZES.sm
        }
      ]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Ask DigiCrop AI about your crops, farm datasets, NDVI, or soil..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={onSendMessage}
          />
          
          <View style={styles.inputBottomRow}>
            <View style={styles.flexRow}>
              <Ionicons 
                name={isGroundingActive ? "shield-checkmark" : "globe-outline"} 
                size={13} 
                color={isGroundingActive ? theme.primary : theme.textSecondary} 
                style={{ marginRight: 4 }} 
              />
              <Text style={[styles.groundingActiveText, { color: isGroundingActive ? theme.primary : theme.textSecondary }]}>
                {isGroundingActive ? 'Grounding Active' : 'General knowledge mode'}
              </Text>
            </View>

            <View style={styles.flexRow}>
              <TouchableOpacity style={styles.attachButton} onPress={() => setModalVisible(true)}>
                <Ionicons name="paperclip" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  { backgroundColor: inputText.trim().length > 0 && !isLoading ? theme.primary : theme.border }
                ]}
                onPress={onSendMessage}
                disabled={inputText.trim().length === 0 || isLoading}
              >
                <Text style={styles.sendBtnText}>Analyze</Text>
                <Ionicons name="send" size={13} color="#FFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Real Status Footer */}
      {isDesktop && (
        <View style={[styles.statusBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={styles.flexRow}>
            <View style={[styles.statusDotGreen, { backgroundColor: geminiConnectedStatus === false ? '#EF4444' : theme.primary }]} />
            <Text style={[styles.statusFooterText, { color: theme.textSecondary }]}>
              {geminiConnectedStatus === false ? 'AI Offline' : 'AI Connected'} • Datasets: {allDatasetsCount} loaded • Chunks: {totalChunksCount} indexed
            </Text>
          </View>
          <Text style={[styles.statusFooterText, { color: theme.textSecondary }]}>
            DigiCrop AI
          </Text>
        </View>
      )}

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
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datasetSelectorBar: {
    paddingVertical: 8,
    paddingHorizontal: SIZES.md,
    borderBottomWidth: 1,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorLabel: {
    fontSize: 10,
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
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  datasetPillText: {
    fontSize: 12,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 4,
  },
  avatarUser: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginTop: 4,
  },
  avatarUserText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  botBubble: {
    borderTopLeftRadius: 4,
  },
  userMetaRow: {
    marginBottom: 4,
  },
  userMetaText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sourceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 11,
  },
  inputContainer: {
    padding: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SIZES.sm,
    paddingTop: 8,
    paddingBottom: 6,
  },
  input: {
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 4,
  },
  inputBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  groundingActiveText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attachButton: {
    padding: 6,
    marginRight: 6,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  quickQuestionsContainer: {
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  quickQuestionsHorizontalContent: {
    paddingHorizontal: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 8,
  },
  quickQuestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  quickQuestionPillText: {
    fontSize: 11,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusFooterText: {
    fontSize: 11,
  }
});
