import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealFarms, getThresholdStatus } from '../services/datasetData';
import datasetService from '../services/datasetService';
import UploadDatasetModal from '../components/UploadDatasetModal';

export default function VegetationIndices({ theme, onOpenUploadModal }) {
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

  const ndviFarms = farms.filter(f => 
    f.ndvi != null || (f.timeSeries && f.timeSeries.some(t => t.ndvi != null))
  );

  if (ndviFarms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="leaf-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Vegetation Index Data Loaded</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Upload or add a dataset containing NDVI telemetry or satellite vegetation indices to view real canopy coverage and health metrics.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={handleOpenModal}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Add Dataset</Text>
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

  const displayedFarms = selectedFarmId === 'ALL' ? ndviFarms : ndviFarms.filter(f => f.id === selectedFarmId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Farm Filter Pills if > 1 farm */}
      {ndviFarms.length > 1 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedFarmId === 'ALL' ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
            onPress={() => setSelectedFarmId('ALL')}
          >
            <Text style={[styles.filterText, selectedFarmId === 'ALL' ? { color: '#FFF' } : { color: theme.text }]}>All Farms ({ndviFarms.length})</Text>
          </TouchableOpacity>

          {ndviFarms.map(f => (
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
        const ndviStatus = farm.ndvi != null ? getThresholdStatus(farm.ndvi, 'ndvi') : null;
        const validSeries = (farm.timeSeries || []).filter(t => t.ndvi != null);

        return (
          <View key={farm.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.indexAcronym, { color: theme.text }]}>{farm.name || farm.id}</Text>
                <Text style={[styles.indexFullName, { color: theme.textSecondary }]}>
                  {farm.crop ? `Crop: ${farm.crop}` : 'Farm Reading'} • {farm.location || 'Loaded Dataset'}
                </Text>
              </View>
              <View style={styles.valueMeta}>
                <Text style={[styles.indexValue, { color: theme.text }]}>{farm.ndvi !== null ? farm.ndvi : 'N/A'}</Text>
                {ndviStatus ? (
                  <Text style={[styles.statusBadge, { color: ndviStatus.color, backgroundColor: ndviStatus.color + '15' }]}>
                    {ndviStatus.label}
                  </Text>
                ) : (
                  <Text style={[styles.statusBadge, { color: theme.textSecondary, backgroundColor: theme.border }]}>
                    Raw Metric
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailsRow}>
              {farm.growthStage ? (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Growth Stage</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{farm.growthStage}</Text>
                </View>
              ) : null}

              {farm.canopyCoverage != null ? (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Canopy Coverage</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{farm.canopyCoverage}%</Text>
                </View>
              ) : null}

              {farm.soilMoisture != null ? (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Associated Soil Moisture</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{farm.soilMoisture}%</Text>
                </View>
              ) : null}
            </View>

            {/* Real Dated Points Chart */}
            {validSeries.length > 1 && (
              <View style={styles.chartBlock}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>NDVI Time Series (Real Dated Points)</Text>
                <View style={styles.barChartContainer}>
                  {validSeries.map((item, idx) => {
                    const val = item.ndvi || 0;
                    const pct = Math.min(100, Math.max(10, val * 100));
                    return (
                      <View key={idx} style={styles.barCol}>
                        <Text style={[styles.barValText, { color: theme.text }]}>{val}</Text>
                        <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.barFill, { backgroundColor: theme.accent || '#06B6D4', height: `${pct}%` }]} />
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
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  indexAcronym: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  indexFullName: {
    fontSize: 14,
    marginTop: 4,
  },
  valueMeta: {
    alignItems: 'flex-end',
  },
  indexValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginVertical: SIZES.lg,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xl,
  },
  detailItem: {
    minWidth: 120,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: 'bold',
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
