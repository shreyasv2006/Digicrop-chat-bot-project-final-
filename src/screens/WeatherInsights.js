import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealWeatherData } from '../services/datasetData';
import datasetService from '../services/datasetService';
import UploadDatasetModal from '../components/UploadDatasetModal';

export default function WeatherInsights({ theme, onOpenUploadModal }) {
  const [weatherRows, setWeatherRows] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = () => {
    setWeatherRows(getRealWeatherData());
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

  if (weatherRows.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="partly-sunny-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Weather Data Loaded</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Upload or add a dataset containing weather logs (date, temperature, rainfall, humidity, wind speed) to view weather insights.
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

  // Check which columns actually exist in dataset
  const hasTemp = weatherRows.some(r => r.temperature != null);
  const hasRain = weatherRows.some(r => r.rainfall != null);
  const hasHum = weatherRows.some(r => r.humidity != null);
  const hasWind = weatherRows.some(r => r.windSpeed != null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Real Weather Records Table */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Real Weather Records</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Date</Text>
          <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Location</Text>
          {hasTemp && <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Temp</Text>}
          {hasRain && <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Rainfall</Text>}
          {hasHum && <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Humidity</Text>}
          {hasWind && <Text style={[styles.th, { color: theme.textSecondary, flex: 1 }]}>Wind</Text>}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {weatherRows.map((r, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.tdBold, { color: theme.text, flex: 1 }]}>{r.date}</Text>
            <Text style={[styles.td, { color: theme.textSecondary, flex: 1 }]}>{r.location}</Text>
            {hasTemp && <Text style={[styles.td, { color: theme.text, flex: 1 }]}>{r.temperature || '-'}</Text>}
            {hasRain && <Text style={[styles.td, { color: theme.text, flex: 1 }]}>{r.rainfall || '-'}</Text>}
            {hasHum && <Text style={[styles.td, { color: theme.text, flex: 1 }]}>{r.humidity || '-'}</Text>}
            {hasWind && <Text style={[styles.td, { color: theme.text, flex: 1 }]}>{r.windSpeed || '-'}</Text>}
          </View>
        ))}
      </View>

      {/* Temperature / Rainfall Real Points Chart if > 1 record */}
      {weatherRows.length > 1 && (hasTemp || hasRain) && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Weather Trend (Real Points Only)</Text>
          <View style={styles.barChartContainer}>
            {weatherRows.map((r, idx) => {
              const rawTemp = r.temperature ? parseFloat(r.temperature) : 0;
              const pct = Math.min(100, Math.max(10, rawTemp * 2.5));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={[styles.barValText, { color: theme.text }]}>{r.temperature || r.rainfall || ''}</Text>
                  <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.barFill, { backgroundColor: theme.primary, height: `${pct}%` }]} />
                  </View>
                  <Text style={[styles.barDateText, { color: theme.textSecondary }]}>{r.date.slice(-5)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  th: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tdBold: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  td: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 6,
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
