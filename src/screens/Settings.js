import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import datasetService from '../services/datasetService';
import { getDetectedFieldsString, clearAllSavedConversations } from '../services/datasetData';
import { clearAllChats } from '../services/chatStorage';
import { confirmDialog, alertDialog, promptDialog, showToast } from '../services/dialogService';
import { BUILD_ID } from '../constants/buildInfo';

const PROFILE_STORAGE_KEY = 'digicrop_user_profile';
const CHAT_PREFS_KEY = 'digicrop_chat_preferences';

export function getUserProfileFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return { displayName: '' };
}

export function saveUserProfileToStorage(prof) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(prof));
    }
  } catch (e) {}
}

export function getChatPreferencesFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CHAT_PREFS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return { answerDetail: 'Standard', showSources: true };
}

export function saveChatPreferencesToStorage(prefs) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(prefs));
    }
  } catch (e) {}
}

export default function Settings({ theme, isDarkMode, toggleTheme, onOpenUploadModal, onResetApp, onChatsCleared, activeProfile }) {
  const [profile, setProfile] = useState(getUserProfileFromStorage());
  const [chatPrefs, setChatPrefs] = useState(getChatPreferencesFromStorage());
  const [datasets, setDatasets] = useState([]);

  const reloadData = () => {
    setDatasets(datasetService.getAllDatasets());
  };

  useEffect(() => {
    reloadData();
    const unsub = datasetService.subscribe(reloadData);
    return () => unsub();
  }, []);

  const handleNameChange = (text) => {
    const updated = { ...profile, displayName: text };
    setProfile(updated);
    saveUserProfileToStorage(updated);
  };

  const handleDetailChange = (detail) => {
    const updated = { ...chatPrefs, answerDetail: detail };
    setChatPrefs(updated);
    saveChatPreferencesToStorage(updated);
  };

  const handleShowSourcesToggle = (val) => {
    const updated = { ...chatPrefs, showSources: val };
    setChatPrefs(updated);
    saveChatPreferencesToStorage(updated);
  };

  const handleRenameDataset = async (ds) => {
    const newName = await promptDialog({
      title: 'Rename Dataset',
      message: `Enter new name for dataset "${ds.name}":`,
      defaultValue: ds.name,
      confirmText: 'Rename',
    });
    if (newName && newName.trim()) {
      datasetService.renameCustomDataset(ds.id, newName.trim());
      reloadData();
      showToast(`Renamed to "${newName.trim()}"`, 'success');
    }
  };

  const handleDeleteDataset = async (ds) => {
    const ok = await confirmDialog({
      title: 'Delete Dataset',
      message: `Are you sure you want to delete dataset "${ds.name}"?`,
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (ok) {
      datasetService.removeCustomDataset(ds.id);
      reloadData();
      showToast(`Deleted "${ds.name}"`, 'info');
    }
  };

  const handleDeleteAllDatasets = async () => {
    const ok = await confirmDialog({
      title: 'Delete All Datasets',
      message: 'Are you sure you want to remove ALL loaded datasets? This action cannot be undone.',
      confirmText: 'Delete All',
      isDestructive: true,
    });
    if (ok) {
      datasetService.removeAllDatasets();
      reloadData();
      showToast('All datasets removed', 'info');
    }
  };

  const handleClearSaved = async () => {
    const ok = await confirmDialog({
      title: 'Clear Saved Items',
      message: 'Are you sure you want to clear all saved conversations and answers?',
      confirmText: 'Clear All',
      isDestructive: true,
    });
    if (ok) {
      clearAllSavedConversations();
      showToast('Saved items cleared!', 'success');
    }
  };

  const handleClearChatHistory = async () => {
    const activeName = activeProfile?.name || profile?.displayName || 'User';
    const confirmMsg = `Clear all chats for profile '${activeName}'? This action cannot be undone.`;

    const ok = await confirmDialog({
      title: 'Clear Profile Chat History',
      message: confirmMsg,
      confirmText: 'Clear Chats',
      isDestructive: true,
    });

    if (ok) {
      await clearAllChats();
      if (onChatsCleared) onChatsCleared();
      showToast(`Chat history for profile '${activeName}' cleared!`, 'success');
    }
  };

  const handleResetApp = async () => {
    const ok = await confirmDialog({
      title: 'Reset DigiCrop AI',
      message: 'Reset DigiCrop AI app and remove all local data? This will clear all chats, datasets, profiles, and settings.',
      confirmText: 'Reset App',
      isDestructive: true,
    });

    if (ok) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      datasetService.removeAllDatasets();
      if (onResetApp) onResetApp();
      if (Platform.OS === 'web') window.location.reload();
    }
  };

  const handleClearMonitor = async () => {
    const ok = await confirmDialog({
      title: 'Clear Monitor Data',
      message: 'Clear all agent monitor trace and latency logs?',
      confirmText: 'Clear Logs',
      isDestructive: true,
    });

    if (ok) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('digicrop_agent_monitor_history');
          showToast('Agent monitor data cleared!', 'success');
        }
      } catch (e) {}
    }
  };


  const safeDatasets = datasets || [];
  const totalChunks = safeDatasets.reduce((acc, d) => acc + (d?.chunkCount || 1), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Section 1: User Profile */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>1. Profile Preferences</Text>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Display Name (Used for Header Initials)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder="e.g. Ramesh Patil or Agronomist"
          placeholderTextColor={theme.textSecondary}
          value={activeProfile?.name || profile?.displayName || ''}
          onChangeText={handleNameChange}
        />
        <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
          🔒 Profiles are saved in this browser only. They are not accounts and do not need a password.
        </Text>
      </View>

      {/* Section 2: Datasets Management Table */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>2. Loaded Datasets Management</Text>
          <TouchableOpacity onPress={onOpenUploadModal}>
            <Text style={{ color: theme.primary, fontSize: 12, textDecorationLine: 'underline', fontWeight: '600' }}>
              Use Add Dataset in the sidebar
            </Text>
          </TouchableOpacity>
        </View>

        {datasets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No datasets loaded in storage.{' '}
              <Text 
                style={{ color: theme.primary, textDecorationLine: 'underline' }}
                onPress={onOpenUploadModal}
              >
                Use Add Dataset in the sidebar
              </Text>
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            {datasets.map((ds) => (
              <View key={ds.id} style={[styles.dsRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dsName, { color: theme.text }]}>{ds.name}</Text>
                  <Text style={[styles.dsMeta, { color: theme.textSecondary }]}>
                    Source: {ds.source} • {ds.chunkCount} Chunks
                  </Text>
                  <Text style={[styles.dsFields, { color: theme.primary }]}>
                    {getDetectedFieldsString(ds)}
                  </Text>
                </View>
                <View style={styles.dsActions}>
                  <TouchableOpacity onPress={() => handleRenameDataset(ds)} style={styles.actionIcon}>
                    <Ionicons name="pencil-outline" size={16} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteDataset(ds)} style={styles.actionIcon}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={[styles.deleteAllBtn, { borderColor: '#EF4444' }]}
              onPress={handleDeleteAllDatasets}
            >
              <Ionicons name="trash" size={14} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Delete All Datasets</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 3: Chat Preferences */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>3. AI Assistant Preferences</Text>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Default Answer Detail Level</Text>
        <View style={styles.pillGroup}>
          {['Concise', 'Standard', 'Detailed'].map((level) => {
            const active = chatPrefs.answerDetail === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.segmentPill,
                  active ? { backgroundColor: theme.primary } : { backgroundColor: theme.background, borderColor: theme.border }
                ]}
                onPress={() => handleDetailChange(level)}
              >
                <Text style={[styles.segmentText, active ? { color: '#FFF' } : { color: theme.text }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Show Sources Under Answers</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Display grounded dataset source badges below bot answers</Text>
          </View>
          <Switch
            value={chatPrefs.showSources}
            onValueChange={handleShowSourcesToggle}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={'#FFF'}
          />
        </View>
      </View>

      {/* Section 4: Data & Privacy */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>4. Data & Privacy</Text>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          🔒 All uploaded datasets, chat history, and preferences are stored locally in this browser only. No data is sent to external databases.
        </Text>

        <View style={styles.privacyBtnRow}>
          <TouchableOpacity style={[styles.privacyBtn, { backgroundColor: theme.border }]} onPress={handleClearChatHistory}>
            <Text style={[styles.privacyBtnText, { color: theme.text }]}>Clear Chat History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.privacyBtn, { backgroundColor: theme.border }]} onPress={handleClearSaved}>
            <Text style={[styles.privacyBtnText, { color: theme.text }]}>Clear Saved Items</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.privacyBtn, { backgroundColor: theme.border }]} onPress={handleClearMonitor}>
            <Text style={[styles.privacyBtnText, { color: theme.text }]}>Clear Monitor Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.privacyBtn, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]} onPress={handleResetApp}>
            <Text style={[styles.privacyBtnText, { color: '#EF4444' }]}>Reset App (Remove All Data)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 5: System About & Connection Status */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>5. System Status</Text>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Application Name</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>DigiCrop AI Web App</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Build Version</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>Build: {BUILD_ID}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={'#FFF'} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Loaded Datasets & Chunks</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{datasets.length} Datasets ({totalChunks} Chunks)</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>AI Engine Connection</Text>
          <Text style={[styles.infoValue, { color: '#10B981' }]}>Online (Connected)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SIZES.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  emptyContainer: {
    paddingVertical: SIZES.md,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  dsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dsName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dsMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  dsFields: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  dsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 6,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.md,
  },
  privacyNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SIZES.md,
  },
  privacyBtnRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    flexWrap: 'wrap',
  },
  privacyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  privacyBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  }
});
