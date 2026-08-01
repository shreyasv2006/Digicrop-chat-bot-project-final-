import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function WeatherInsights({ theme }) {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const forecast = [
    { day: 'Monday', temp: '25°C / 16°C', cond: 'Partly Cloudy', icon: 'partly-sunny', rain: '10%' },
    { day: 'Tuesday', temp: '26°C / 17°C', cond: 'Sunny', icon: 'sunny', rain: '0%' },
    { day: 'Wednesday', temp: '22°C / 15°C', cond: 'Moderate Rain', icon: 'rainy', rain: '80%' },
    { day: 'Thursday', temp: '21°C / 14°C', cond: 'Showers', icon: 'rainy', rain: '65%' },
    { day: 'Friday', temp: '24°C / 16°C', cond: 'Mostly Cloudy', icon: 'cloudy', rain: '15%' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Current Weather Card */}
      <View style={[styles.mainWeatherCard, { backgroundColor: theme.primary, borderColor: theme.border }]}>
        <View style={styles.weatherLeft}>
          <Text style={styles.currentTemp}>24°C</Text>
          <Text style={styles.currentCondition}>Partly Cloudy</Text>
          <Text style={styles.weatherLocation}>North Field A - Location</Text>
        </View>
        <Ionicons name="partly-sunny" size={80} color="#FFF" style={styles.weatherLargeIcon} />
      </View>

      {/* Grid of Weather Metrics */}
      <View style={[styles.metricsContainer, { flexDirection: isLarge ? 'row' : 'column' }]}>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
          <Ionicons name="water-outline" size={24} color={theme.primary} />
          <View style={styles.metricText}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Humidity</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>62%</Text>
          </View>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
          <Ionicons name="speedometer-outline" size={24} color={theme.primary} />
          <View style={styles.metricText}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Wind Speed</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>12 km/h</Text>
          </View>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
          <Ionicons name="umbrella-outline" size={24} color={theme.primary} />
          <View style={styles.metricText}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Precipitation</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>0.2 mm</Text>
          </View>
        </View>
      </View>

      {/* Growing Degree Days (GDD) Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Growing Degree Days (GDD) Tracker</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          GDD is heat accumulation used to predict plant development stages. Current crop cycles are calculated using a baseline temperature of 10°C.
        </Text>
        <View style={styles.gddStats}>
          <View style={styles.gddCol}>
            <Text style={[styles.gddVal, { color: theme.text }]}>120 GDD</Text>
            <Text style={[styles.gddLabel, { color: theme.textSecondary }]}>Accumulated GDD (This Week)</Text>
          </View>
          <View style={styles.gddCol}>
            <Text style={[styles.gddVal, { color: theme.text }]}>840 GDD</Text>
            <Text style={[styles.gddLabel, { color: theme.textSecondary }]}>Total Accumulated GDD</Text>
          </View>
        </View>
      </View>

      {/* 5-Day Forecast List */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>5-Day Forecast</Text>
        {forecast.map((item, index) => (
          <View key={index} style={styles.forecastRow}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{item.day}</Text>
            <View style={styles.forecastConditionContainer}>
              <Ionicons name={item.icon} size={20} color={theme.primary} />
              <Text style={[styles.forecastConditionText, { color: theme.textSecondary }]}>{item.cond}</Text>
            </View>
            <Text style={[styles.forecastTemp, { color: theme.text }]}>{item.temp}</Text>
            <Text style={[styles.forecastRain, { color: theme.primary }]}>{item.rain} Rain</Text>
          </View>
        ))}
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
  },
  currentCondition: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
    marginVertical: SIZES.xs,
  },
  weatherLocation: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    padding: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
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
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SIZES.lg,
  },
  gddStats: {
    flexDirection: 'row',
    gap: SIZES.lg,
  },
  gddCol: {
    flex: 1,
  },
  gddVal: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  gddLabel: {
    fontSize: 13,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  forecastDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  forecastConditionContainer: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  forecastConditionText: {
    fontSize: 14,
  },
  forecastTemp: {
    flex: 1.2,
    fontSize: 14,
    textAlign: 'right',
  },
  forecastRain: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  }
});
