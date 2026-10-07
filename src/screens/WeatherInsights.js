import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getRealWeatherData } from '../services/datasetData';

export default function WeatherInsights({ theme, onOpenUploadModal }) {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;
  const { current, forecast } = getRealWeatherData();

  if (!current && forecast.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="partly-sunny-outline" size={40} color={theme.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Weather Data Loaded</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            No weather or agro-meteorology records are present in loaded datasets. Add a weather dataset (.csv or .md) to inspect real temperature, rainfall, and forecasts.
          </Text>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={onOpenUploadModal}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>+ Add Weather Dataset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Current Weather Card */}
      {current && (
        <View style={[styles.mainWeatherCard, { backgroundColor: theme.primary, borderColor: theme.border }]}>
          <View style={styles.weatherLeft}>
            <Text style={styles.currentTemp}>{current.temperature || 'N/A'}</Text>
            <Text style={styles.currentCondition}>{current.condition}</Text>
            <Text style={styles.weatherLocation}>{current.location}</Text>
          </View>
          <Ionicons name="partly-sunny" size={72} color="#FFF" style={styles.weatherLargeIcon} />
        </View>
      )}

      {/* Grid of Weather Metrics */}
      {current && (
        <View style={[styles.metricsContainer, { flexDirection: isLarge ? 'row' : 'column' }]}>
          {current.humidity && (
            <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
              <Ionicons name="water-outline" size={24} color={theme.primary} />
              <View style={styles.metricText}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Humidity</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{current.humidity}</Text>
              </View>
            </View>
          )}

          {current.windSpeed && (
            <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
              <Ionicons name="speedometer-outline" size={24} color={theme.primary} />
              <View style={styles.metricText}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Wind Speed</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{current.windSpeed}</Text>
              </View>
            </View>
          )}

          {current.precipitation && (
            <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
              <Ionicons name="umbrella-outline" size={24} color={theme.primary} />
              <View style={styles.metricText}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Precipitation / Rain</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{current.precipitation}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Forecast List */}
      {forecast.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Observed Weather Records</Text>
          {forecast.map((item, index) => (
            <View key={index} style={styles.forecastRow}>
              <Text style={[styles.forecastDay, { color: theme.text }]}>{item.day}</Text>
              <Text style={[styles.forecastText, { color: theme.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 20,
    marginBottom: 16,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mainWeatherCard: {
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
  },
  weatherLeft: {
    flex: 1,
  },
  currentTemp: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
  },
  currentCondition: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginVertical: 4,
  },
  weatherLocation: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  weatherLargeIcon: {
    opacity: 0.9,
  },
  metricsContainer: {
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
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
  forecastRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  forecastText: {
    fontSize: 13,
  }
});
