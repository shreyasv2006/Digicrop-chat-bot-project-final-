import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService } from '../services/datasetService';

export default function KnowledgeGroundingPane({ theme, onOpenUploadModal, onDatasetChanged }) {
  const [datasets, setDatasets] = useState([]);

  const reloadDatasets = () => {
    setDatasets(datasetService.getAllDatasets());
  };

  useEffect(() => {
    reloadDatasets();
  }, []);

  const handleDelete = (ds) => {
    if (!ds.isCustom) return;
    
    const confirmDelete = () => {
      datasetService.removeCustomDataset(ds.id);
      reloadDatasets();
      if (onDatasetChanged) onDatasetChanged();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete dataset "${ds.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Dataset',
        `Are you sure you want to delete "${ds.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderLeftColor: theme.border }]}>
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
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No datasets added yet.</Text>
            </View>
          ) : (
            datasets.map((ds) => (
              <View key={ds.id} style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.datasetRow}>
                  <View style={styles.flexRow}>
                    <Ionicons 
                      name={ds.isCustom ? "document-text-outline" : "analytics-outline"} 
                      size={15} 
                      color={ds.isCustom ? theme.accent : theme.primary} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                      {ds.name}
                    </Text>
                  </View>
                  <View style={[styles.syncedChip, { backgroundColor: ds.isCustom ? theme.accent + '20' : theme.primary + '20' }]}>
                    <Text style={[styles.syncedChipText, { color: ds.isCustom ? theme.accent : theme.primary }]}>
                      {ds.source}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>
                    {ds.chunkCount} {ds.chunkCount === 1 ? 'Chunk' : 'Chunks'} {ds.farmId ? `• ${ds.farmId}` : ''}
                  </Text>
                  {ds.isCustom && (
                    <TouchableOpacity onPress={() => handleDelete(ds)} style={{ paddingLeft: 6 }}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Add / Upload Button */}
          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: theme.cardBg, borderColor: theme.primary + '50' }]}
            onPress={onOpenUploadModal}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.uploadBtnText, { color: theme.primary }]}>+ Add Dataset (.md / .csv / .txt)</Text>
          </TouchableOpacity>
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
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  datasetCard: {
    padding: 10,
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
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncedChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncedChipText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datasetMetaText: {
    fontSize: 11,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
