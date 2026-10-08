import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealFarms, getThresholdStatus } from '../services/datasetData';
import datasetService from '../services/datasetService';
import UploadDatasetModal from '../components/UploadDatasetModal';

export default function SoilAnalysis({ theme, onOpenUploadModal }) {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = () => {
    const realFarms = getRealFarms();
    setFarms(realFarms);
  };

  useEffect(() => {
    loadData();
    const unsub = datasetService.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleOpenModal = () => {
    if (onOpenUploadModal) {
      onOpenUploadModal();
    } else {
      setModalVisible(true);
    }
  };

  const soilFarms = farms.filter(f => 
    f.ph != null || f.soilMoisture != null || f.temperature != null || f.ec != null || f.nitrogen != null ||
    (f.timeSeries && f.timeSeries.some(t => t.ph != null || t.soilMoisture != null))
  );

  if (soilFarms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="flask-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Soil Analysis Data Loaded</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Upload or add a dataset containing soil telemetry (pH, moisture %, EC, temperature) to view real soil metrics and threshold evaluations.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={handleOpenModal}
          >
            <Text style={{ color: theme.primary, textDecorationLine: 'underline', fontSize: 13, fontWeight: '500' }}>
              Use Add Dataset in the sidebar
            </Text>
          </TouchableOpacity>
        </View>

        <UploadDatasetModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          theme={theme}
          onUploadSuccess={loadData}
        />
      </View>
    );
  }

  const displayedFarms = selectedFarmId === 'ALL' ? soilFarms : soilFarms.filter(f => f.id === selectedFarmId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Farm Filter Pills if > 1 farm */}
      {soilFarms.length > 1 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedFarmId === 'ALL' ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
            onPress={() => setSelectedFarmId('ALL')}
          >
            <Text style={[styles.filterText, selectedFarmId === 'ALL' ? { color: '#FFF' } : { color: theme.text }]}>All Farms ({soilFarms.length})</Text>
          </TouchableOpacity>

          {soilFarms.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterPill,
                selectedFarmId === f.id ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
              ]}
              onPress={() => setSelectedFarmId(f.id)}
            >
              <Text style={[styles.filterText, selectedFarmId === f.id ? { color: '#FFF' } : { color: theme.text }]}>{f.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {displayedFarms.map((farm) => {
        const phStatus = farm.ph != null ? getThresholdStatus(farm.ph, 'ph') : null;
        const moistureStatus = farm.soilMoisture != null ? getThresholdStatus(farm.soilMoisture, 'moisture') : null;
        const ecStatus = farm.ec != null ? getThresholdStatus(farm.ec, 'ec') : null;

        // Extract dated series
        const validSeries = (farm.timeSeries || []).filter(t => t.soilMoisture != null || t.ph != null);

        return (
          <View key={farm.id} style={[styles.farmBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.farmHeader}>
              <Text style={[styles.farmTitle, { color: theme.text }]}>{farm.name || farm.id}</Text>
              <Text style={[styles.farmLocation, { color: theme.textSecondary }]}>{farm.location || 'Loaded Dataset'}</Text>
            </View>

            <View style={styles.grid}>
              {farm.ph != null && (
                <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil pH</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{farm.ph}</Text>
                  {phStatus ? (
                    <Text style={[styles.statDesc, { color: phStatus.color }]}>{phStatus.label}</Text>
                  ) : (
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Metric</Text>
                  )}
                </View>
              )}

              {farm.soilMoisture != null && (
                <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil Moisture</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{farm.soilMoisture}%</Text>
                  {moistureStatus ? (
                    <Text style={[styles.statDesc, { color: moistureStatus.color }]}>{moistureStatus.label}</Text>
                  ) : (
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Metric</Text>
                  )}
                </View>
              )}

              {farm.ec != null && (
                <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Electrical Conductivity (EC)</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{farm.ec} dS/m</Text>
                  {ecStatus ? (
                    <Text style={[styles.statDesc, { color: ecStatus.color }]}>{ecStatus.label}</Text>
                  ) : (
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Metric</Text>
                  )}
                </View>
              )}

              {farm.temperature != null && (
                <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil Temperature</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{farm.temperature}°C</Text>
                  <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Metric</Text>
                </View>
              )}
            </View>

            {/* Time Series Bar Chart over real points if > 1 dated rows */}
            {validSeries.length > 1 && (
              <View style={styles.chartBlock}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Soil Moisture Trend (Real Points)</Text>
                <View style={styles.barChartContainer}>
                  {validSeries.map((item, idx) => {
                    const val = item.soilMoisture || 0;
                    const pct = Math.min(100, Math.max(10, val * 2));
                    return (
                      <View key={idx} style={styles.barCol}>
                        <Text style={[styles.barValText, { color: theme.text }]}>{val}%</Text>
                        <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.barFill, { backgroundColor: theme.primary, height: `${pct}%` }]} />
                        </View>
                        <Text style={[styles.barDateText, { color: theme.textSecondary }]}>{item.date.slice(-5)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}

      <UploadDatasetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        onUploadSuccess={loadData}
      />
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
  filterRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.xxl,
    minHeight: 400,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 440,
    marginBottom: SIZES.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  farmBlock: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  farmHeader: {
    marginBottom: SIZES.lg,
  },
  farmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  farmLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statDesc: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartBlock: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SIZES.md,
    height: 120,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barValText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 80,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barDateText: {
    fontSize: 10,
    marginTop: 4,
  }
});
