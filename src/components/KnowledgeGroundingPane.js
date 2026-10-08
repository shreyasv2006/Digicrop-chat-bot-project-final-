import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService } from '../services/datasetService';
import { getDetectedFieldsString } from '../services/datasetData';
import { confirmDialog, showToast } from '../services/dialogService';

export default function KnowledgeGroundingPane({ theme, onDatasetChanged, isOpen = true }) {
  const [datasets, setDatasets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const reloadDatasets = () => {
    setDatasets(datasetService.getAllDatasets());
  };

  useEffect(() => {
    reloadDatasets();
    const unsub = datasetService.subscribe(reloadDatasets);
    return () => unsub();
  }, []);

  const handleStartRename = (ds) => {
    setEditingId(ds.id);
    setEditingName(ds.name);
  };

  const handleFinishRename = (id) => {
    if (editingName.trim()) {
      datasetService.renameCustomDataset(id, editingName.trim());
      reloadDatasets();
      if (onDatasetChanged) onDatasetChanged();
    }
    setEditingId(null);
  };

  const handleDelete = async (ds) => {
    const ok = await confirmDialog({
      title: 'Delete Dataset',
      message: `Delete dataset "${ds.name}"?`,
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (ok) {
      datasetService.removeCustomDataset(ds.id);
      reloadDatasets();
      if (onDatasetChanged) onDatasetChanged();
      showToast(`Deleted "${ds.name}"`, 'info');
    }
  };


  if (!isOpen) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderLeftColor: theme.border,
        },
        Platform.OS === 'web' && {
          transition: 'width 200ms ease, opacity 200ms ease',
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surfaceDark, borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.flexRow}>
            <Ionicons name="server-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>INGESTED KNOWLEDGE</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
            <Text style={[styles.activeBadgeText, { color: theme.primary }]}>{datasets.length} Loaded</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Loaded Datasets</Text>

          {datasets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No datasets added yet. Use Add Dataset in the sidebar.
              </Text>
            </View>
          ) : (
            datasets.map((ds) => {
              const isEditing = editingId === ds.id;
              return (
                <View key={ds.id} style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <View style={styles.datasetRow}>
                    <View style={styles.flexRow}>
                      <Feather 
                        name="file-text" 
                        size={15} 
                        color={theme.accent} 
                        style={{ marginRight: 6 }} 
                      />
                      {isEditing ? (
                        <TextInput
                          style={[
                            styles.renameInput,
                            {
                              color: theme.text,
                              backgroundColor: theme.background,
                              borderColor: theme.primary,
                            },
                          ]}
                          value={editingName}
                          onChangeText={setEditingName}
                          autoFocus
                          onBlur={() => handleFinishRename(ds.id)}
                          onSubmitEditing={() => handleFinishRename(ds.id)}
                        />
                      ) : (
                        <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                          {ds.name}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.syncedChip, { backgroundColor: theme.accent + '20' }]}>
                      <Text style={[styles.syncedChipText, { color: theme.accent }]}>
                        {ds.source}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.detectedText, { color: theme.primary }]} numberOfLines={2}>
                    {getDetectedFieldsString(ds)}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>
                      {ds.chunkCount} {ds.chunkCount === 1 ? 'Chunk' : 'Chunks'} {ds.farmId ? `• ${ds.farmId}` : ''}
                    </Text>
                    
                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        onPress={() => isEditing ? handleFinishRename(ds.id) : handleStartRename(ds)}
                        style={{ paddingHorizontal: 6 }}
                        title="Rename dataset"
                      >
                        <Feather name={isEditing ? "check" : "edit-2"} size={13} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDelete(ds)} 
                        style={{ paddingLeft: 4 }}
                        title="Delete dataset"
                      >
                        <Feather name="trash-2" size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    borderLeftWidth: 1,
    height: '100%',
    overflow: 'hidden',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  header: {
    padding: SIZES.md,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
  },
  section: {
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  datasetCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  datasetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  datasetName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  renameInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  syncedChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  syncedChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detectedText: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datasetMetaText: {
    fontSize: 11,
  },
});
