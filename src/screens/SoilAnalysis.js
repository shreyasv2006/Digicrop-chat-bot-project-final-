import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealFarms, getThresholdStatus } from '../services/datasetData';
import datasetService from '../services/datasetService';
import UploadDatasetModal from '../components/UploadDatasetModal';

export default function SoilAnalysis({ theme, onNavigate }) {
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

  // Filter farms that have at least one soil reading
  const soilFarms = farms.filter(f => 
    f.ph != null || f.soilMoisture != null || f.temperature != null || f.ec != null || f.nitrogen != null
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
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Add Soil Dataset</Text>
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
      {soilFarms.map((farm) => {
        const phStatus = farm.ph != null ? getThresholdStatus(farm.ph, 'ph', thresholds) : null;
        const moistureStatus = farm.soilMoisture != null ? getThresholdStatus(farm.soilMoisture, 'moisture', thresholds) : null;
        const ecStatus = farm.ec != null ? getThresholdStatus(farm.ec, 'ec', thresholds) : null;
        const tempStatus = farm.temperature != null ? getThresholdStatus(farm.temperature, 'temperature', thresholds) : null;

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
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Reading</Text>
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
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Reading</Text>
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
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Reading</Text>
                  )}
                </View>
              )}

              {farm.temperature != null && (
                <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil Temperature</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{farm.temperature}°C</Text>
                  {tempStatus ? (
                    <Text style={[styles.statDesc, { color: tempStatus.color }]}>{tempStatus.label}</Text>
                  ) : (
                    <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Raw Reading</Text>
                  )}
                </View>
              )}
            </View>

            {/* Nutrients NPK section if available */}
            {(farm.nitrogen != null || farm.phosphorus != null || farm.potassium != null) && (
              <View style={styles.npkSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Real NPK Soil Metrics</Text>
                {farm.nitrogen != null && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientName, { color: theme.text }]}>Nitrogen (N)</Text>
                    <Text style={[styles.nutrientVal, { color: theme.text }]}>{farm.nitrogen} mg/kg</Text>
                  </View>
                )}
                {farm.phosphorus != null && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientName, { color: theme.text }]}>Phosphorus (P)</Text>
                    <Text style={[styles.nutrientVal, { color: theme.text }]}>{farm.phosphorus} mg/kg</Text>
                  </View>
                )}
                {farm.potassium != null && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientName, { color: theme.text }]}>Potassium (K)</Text>
                    <Text style={[styles.nutrientVal, { color: theme.text }]}>{farm.potassium} mg/kg</Text>
                  </View>
                )}
              </View>
            )}
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
  npkSection: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  nutrientName: {
    fontSize: 14,
  },
  nutrientVal: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

