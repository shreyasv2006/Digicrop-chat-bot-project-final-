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
            <Ionicons name="server-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>KNOWLEDGE GROUNDING</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
            <Text style={[styles.activeBadgeText, { color: theme.primary }]}>4 Active</Text>
          </View>
        </View>
        <Text style={[styles.headerDesc, { color: theme.textSecondary }]}>
          AI agronomist responses are bound strictly to validated farm telemetry and crop pathology repositories.
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Ingested Datasets List */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Ingested Grounding Datasets</Text>

          {/* Dataset Item 1 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="document-text-outline" size={15} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  soil_tdt_probes_oct2026.csv
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.syncedChipText, { color: theme.primary }]}>Synced</Text>
              </View>
            </View>
            <View style={styles.datasetMetaRow}>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>2,410 Readings • 6 Farms</Text>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>2 mins ago</Text>
            </View>
          </View>

          {/* Dataset Item 2 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="planet-outline" size={15} color={theme.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  sentinel2_ndvi_weekly.tif
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.syncedChipText, { color: theme.accent }]}>Live Layer</Text>
              </View>
            </View>
            <View style={styles.datasetMetaRow}>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>Resolution: 10m/px</Text>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>Today 06:00</Text>
            </View>
          </View>

          {/* Dataset Item 3 */}
          <View style={[styles.datasetCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.datasetRow}>
              <View style={styles.flexRow}>
                <Ionicons name="book-outline" size={15} color={theme.alertAmber} style={{ marginRight: 6 }} />
                <Text style={[styles.datasetName, { color: theme.text }]} numberOfLines={1}>
                  icar_crop_pathology_v3.pdf
                </Text>
              </View>
              <View style={[styles.syncedChip, { backgroundColor: '#334155' }]}>
                <Text style={[styles.syncedChipText, { color: '#E2E8F0' }]}>Vectorized</Text>
              </View>
            </View>
            <View style={styles.datasetMetaRow}>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>512 Chunks • 768-dim</Text>
              <Text style={[styles.datasetMetaText, { color: theme.textSecondary }]}>Static Core</Text>
            </View>
          </View>

          {/* Upload Button */}
          <TouchableOpacity 
            style={[styles.uploadBtn, { backgroundColor: theme.cardBg, borderColor: theme.primary + '50' }]}
            onPress={onOpenUploadModal}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.uploadBtnText, { color: theme.primary }]}>Upload Telemetry / CSV / .md</Text>
          </TouchableOpacity>
        </View>

        {/* Guardrails & Policy Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
              Guardrails & Policy
            </Text>
            <Text style={[styles.strictText, { color: theme.primary }]}>Strict Mode</Text>
          </View>

          {/* Setting Card */}
          <View style={[styles.policyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.policyRow}>
              <Text style={[styles.policyLabel, { color: theme.text }]}>Deterministic Temp</Text>
              <View style={[styles.tempChip, { backgroundColor: theme.background }]}>
                <Text style={[styles.tempChipText, { color: theme.primary }]}>0.10</Text>
              </View>
            </View>
            <Text style={[styles.policyDesc, { color: theme.textSecondary }]}>
              Prevents hallucinated agronomy advice. Model relies purely on telemetry ground truth.
            </Text>
          </View>

          {/* System Lockdown Card */}
          <View style={[styles.policyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.policyRow}>
              <Text style={[styles.policyLabel, { color: theme.text }]}>System Instruction Lockdown</Text>
              <Ionicons name="lock-closed" size={13} color={theme.primary} />
            </View>
            <View style={[styles.lockdownBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.lockdownText, { color: theme.textSecondary }]}>
                "You are DigiCrop AI. Answer exclusively from ingested farm datasets F001-F006. If telemetry is absent, reject answering and recommend sensor inspection."
              </Text>
            </View>
          </View>

          {/* Token Usage & Quota Gauge */}
          <View style={[styles.policyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.policyRow}>
              <Text style={[styles.policyLabel, { color: theme.text }]}>Daily API Quota</Text>
              <Text style={[styles.quotaUsageText, { color: theme.textSecondary }]}>18.4k / 500k tokens</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
              <View style={[styles.progressBar, { backgroundColor: theme.primary, width: '4%' }]} />
            </View>
            <View style={styles.quotaMetaRow}>
              <Text style={[styles.quotaMetaText, { color: theme.textSecondary }]}>Latency: 284ms</Text>
              <Text style={[styles.quotaMetaText, { color: theme.primary }]}>Rate Limit: Nominal</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
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
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  body: {
    flex: 1,
  },
  section: {
    padding: SIZES.md,
    borderBottomWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  strictText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  datasetCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  datasetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  datasetName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncedChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  syncedChipText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  datasetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datasetMetaText: {
    fontSize: 10,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  policyCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tempChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tempChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  policyDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  lockdownBox: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  lockdownText: {
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  quotaUsageText: {
    fontSize: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  quotaMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaMetaText: {
    fontSize: 10,
  }
});
