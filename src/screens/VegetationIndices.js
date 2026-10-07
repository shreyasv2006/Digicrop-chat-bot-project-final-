import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealFarms, getThresholdStatus } from '../services/datasetData';
import datasetService from '../services/datasetService';
import UploadDatasetModal from '../components/UploadDatasetModal';

export default function VegetationIndices({ theme }) {
  const [farms, setFarms] = useState([]);
  const [thresholds, setThresholds] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = () => {
    const data = getRealFarms();
    setFarms(data.farms || []);
    setThresholds(data.thresholds || {});
  };

  useEffect(() => {
    loadData();
    const unsubscribe = datasetService.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const ndviFarms = farms.filter(f => f.ndvi != null);

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
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Add NDVI Dataset</Text>
          </TouchableOpacity>
        </View>

        <UploadDatasetModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          theme={theme}
          onUploadSuccess={() => loadData()}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageHeading, { color: theme.text }]}>Real Vegetation Index (NDVI) Readings</Text>
      
      {ndviFarms.map((farm) => {
        const ndviStatus = getThresholdStatus(farm.ndvi, 'ndvi', thresholds);

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
                <Text style={[styles.indexValue, { color: theme.text }]}>{farm.ndvi}</Text>
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
          </View>
        );
      })}

      <UploadDatasetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        onUploadSuccess={() => loadData()}
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
  pageHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SIZES.lg,
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
  }
});

