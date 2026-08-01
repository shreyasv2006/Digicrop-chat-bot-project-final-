import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function SoilAnalysis({ theme }) {
  const nutrients = [
    { element: 'Nitrogen (N)', val: '45 mg/kg', status: 'Medium', level: 0.5, color: '#3B82F6' },
    { element: 'Phosphorus (P)', val: '22 mg/kg', status: 'High', level: 0.85, color: theme.primary },
    { element: 'Potassium (K)', val: '180 mg/kg', status: 'Optimal', level: 0.7, color: theme.primary },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Overview stats */}
      <View style={styles.grid}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil PH Level</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>6.5</Text>
          <Text style={[styles.statDesc, { color: theme.primary }]}>Optimal (Slightly Acidic)</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Soil Temperature</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>18.5°C</Text>
          <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Measured at 10cm depth</Text>
        </View>
      </View>

      {/* Nutrients Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Primary Nutrients (NPK) Levels</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Current soil macronutrient levels mapped from chemical sensors and historical soil probes. Recommended adjustments will optimize upcoming tillering stages.
        </Text>

        {nutrients.map((item, index) => (
          <View key={index} style={styles.nutrientRow}>
            <View style={styles.nutrientHeader}>
              <Text style={[styles.nutrientName, { color: theme.text }]}>{item.element}</Text>
              <View style={styles.nutrientMeta}>
                <Text style={[styles.nutrientValue, { color: theme.text }]}>{item.val}</Text>
                <Text style={[styles.nutrientStatusBadge, { color: item.color, backgroundColor: item.color + '15' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { backgroundColor: item.color, width: `${item.level * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Recommendation Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Soil Treatment Recommendations</Text>
        <View style={styles.recsBox}>
          <View style={styles.recItem}>
            <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
            <Text style={[styles.recText, { color: theme.text }]}>
              Nitrogen levels are currently in the medium range. Consider side-dressing nitrogen fertilizer (e.g., urea) at a rate of 40 kg/ha within the next 7 days.
            </Text>
          </View>
          <View style={styles.recItem}>
            <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
            <Text style={[styles.recText, { color: theme.text }]}>
              Soil pH is 6.5, which is ideal for maize and soybean cultivation. Lime application is not required.
            </Text>
          </View>
        </View>
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
  grid: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SIZES.xs,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  statDesc: {
    fontSize: 13,
    fontWeight: '600',
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
  nutrientRow: {
    marginBottom: SIZES.lg,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  nutrientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  nutrientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  nutrientStatusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  recsBox: {
    gap: SIZES.md,
  },
  recItem: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  recText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  }
});
