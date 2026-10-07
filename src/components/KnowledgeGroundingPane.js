import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function KnowledgeGroundingPane({ theme, onOpenUploadModal }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderLeftColor: theme.border }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surfaceDark, borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.flexRow}>
            <Ionicons name="server-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>FARM DATASETS</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
            <Text style={[styles.activeBadgeText, { color: theme.primary }]}>Active</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Ingested Datasets List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Ingested Knowledge</Text>

          {/* Dataset Item 1 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="analytics-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  Soil TDT Telemetry
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.syncedChipText, { color: theme.primary }]}>Synced</Text>
              </View>
            </View>
            <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>2,410 Readings • 6 Farms</Text>
          </View>

          {/* Dataset Item 2 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="planet-outline" size={16} color={theme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  Sentinel-2 NDVI Layer
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.syncedChipText, { color: theme.accent }]}>Live</Text>
              </View>
            </View>
            <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>Resolution 10m/px</Text>
          </View>

          {/* Dataset Item 3 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="book-outline" size={16} color={theme.alertAmber} style={{ marginRight: 8 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  ICAR Crop Pathology
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: '#334155' }]}>
                <Text style={[styles.syncedChipText, { color: '#E2E8F0' }]}>RAG Core</Text>
              </View>
            </View>
            <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>512 Knowledge Chunks</Text>
          </View>

          {/* Upload Button */}
          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: theme.cardBg, borderColor: theme.primary + '50' }]}
            onPress={onOpenUploadModal}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.uploadBtnText, { color: theme.primary }]}>Upload Dataset (.md / .csv)</Text>
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
  syncedChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncedChipText: {
    fontSize: 10,
    fontWeight: 'bold',
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

