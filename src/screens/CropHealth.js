import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealFarms, getRealAlerts, getThresholdStatus } from '../services/datasetData';
import datasetService from '../services/datasetService';

export default function CropHealth({ theme, onNavigate, onOpenUploadModal, onSelectQuestion }) {
  const [realFarms, setRealFarms] = useState([]);
  const [realAlerts, setRealAlerts] = useState([]);

  const loadData = () => {
    setRealFarms(getRealFarms());
    setRealAlerts(getRealAlerts());
  };

  useEffect(() => {
    loadData();
    const unsub = datasetService.subscribe(loadData);
    return () => unsub();
  }, []);

  const sortedAlerts = [...realAlerts].sort((a, b) => (a.severity === 'Critical' ? -1 : 1));
  const topAlert = sortedAlerts.length > 0 ? sortedAlerts[0] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Real Alert Banner (Highest severity first) */}
      {topAlert && (
        <View style={[styles.alertCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={22} color="#DC2626" />
            <Text style={[styles.alertTitle, { color: '#991B1B' }]}>
              Health Alert: {topAlert.farmId} ({topAlert.severity})
            </Text>
          </View>
          <Text style={[styles.alertText, { color: '#7F1D1D' }]}>
            {topAlert.title} (Source: {topAlert.datasetName})
          </Text>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => {
              if (onSelectQuestion) onSelectQuestion(`What is the alert status of ${topAlert.farmId}?`);
              onNavigate('AI Assistant');
            }}
          >
            <Text style={styles.actionBtnText}>Consult AI Assistant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Health Status Screen */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Crop Growth & Telemetry Details</Text>
        
        {realFarms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No crop health telemetry loaded. Add a dataset to inspect crop growth and alerts.
            </Text>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={onOpenUploadModal}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>+ Add Dataset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          realFarms.map((farm, idx) => {
            const ndviStatus = farm.ndvi !== null ? getThresholdStatus('NDVI', farm.ndvi) : null;
            const coveragePct = farm.ndvi !== null ? Math.min(100, Math.round(farm.ndvi * 100)) : null;

            return (
              <View key={farm.id} style={styles.cropRow}>
                <View style={styles.cropHeader}>
                  <View style={styles.cropMeta}>
                    <Text style={[styles.cropFieldName, { color: theme.text }]}>
                      {farm.id} - {farm.name}
                    </Text>
                    <Text style={[styles.cropName, { color: theme.textSecondary }]}>
                      {farm.crop || 'Crop'} {farm.growthStage ? `• ${farm.growthStage}` : ''}
                    </Text>
                  </View>
                  {ndviStatus ? (
                    <Text style={[styles.statusBadge, { color: ndviStatus.color, backgroundColor: ndviStatus.color + '15' }]}>
                      {ndviStatus.label}
                    </Text>
                  ) : farm.overallStatus ? (
                    <Text style={[styles.statusBadge, { color: theme.primary, backgroundColor: theme.primary + '15' }]}>
                      {farm.overallStatus}
                    </Text>
                  ) : null}
                </View>

                {/* Progress bar ONLY if real metric (e.g. NDVI) is present */}
                {coveragePct !== null && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>NDVI Vigor / Canopy Index</Text>
                      <Text style={[styles.progressVal, { color: theme.text }]}>{farm.ndvi} ({coveragePct}%)</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: ndviStatus ? ndviStatus.color : theme.primary, width: `${coveragePct}%` }]} />
                    </View>
                  </View>
                )}
                {idx < realFarms.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              </View>
            );
          })
        )}
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
  alertCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: SIZES.xs,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  cropRow: {
    marginBottom: SIZES.sm,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cropMeta: {
    flex: 1,
  },
  cropFieldName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cropName: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 12,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  }
});
