import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function VegetationIndices({ theme }) {
  const [selectedIndex, setSelectedIndex] = useState('NDVI');

  const indices = {
    NDVI: {
      name: 'Normalized Difference Vegetation Index',
      value: '0.78',
      status: 'Optimal',
      desc: 'NDVI evaluates the density and health of green vegetation. Chlorophyll absorbs red light, whereas the mesophyll cell structure of leaves strongly reflects near-infrared light. Higher readings represent healthy, dense crop cover.',
      details: 'Current measurements indicate strong canopy closures in Field A and B, suggesting stable development stages.',
    },
    NDRE: {
      name: 'Normalized Difference Red Edge',
      value: '0.52',
      status: 'Medium',
      desc: 'NDRE uses the red-edge spectrum which penetrates leaf layers deeper than red light. This makes it sensitive to canopy chlorophyll levels in advanced growth stages where NDVI has already saturated.',
      details: 'Slight chlorophyll decline noted in North Field A corn leaves, suggesting potential crop nitrogen dilution.',
    },
    NDWI: {
      name: 'Normalized Difference Water Index',
      value: '0.64',
      status: 'Optimal',
      desc: 'NDWI is sensitive to liquid water molecules in crop leaf structures. It monitors vegetation water content and liquid moisture storage, serving as an early indicator of drought stress before physical crop wilting occurs.',
      details: 'Current readings show no imminent crop water deficit or water stress warnings across all fields.',
    }
  };

  const active = indices[selectedIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Index Selection Pills */}
      <View style={styles.pillsRow}>
        {Object.keys(indices).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.pillBtn,
              selectedIndex === key ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
            onPress={() => setSelectedIndex(key)}
          >
            <Text style={[
              styles.pillBtnText,
              selectedIndex === key ? { color: '#FFF' } : { color: theme.text }
            ]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Details Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.indexAcronym, { color: theme.text }]}>{selectedIndex}</Text>
            <Text style={[styles.indexFullName, { color: theme.textSecondary }]}>{active.name}</Text>
          </View>
          <View style={styles.valueMeta}>
            <Text style={[styles.indexValue, { color: theme.text }]}>{active.value}</Text>
            <Text style={[styles.statusBadge, { color: theme.primary, backgroundColor: theme.primary + '15' }]}>
              {active.status}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>What it measures</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{active.desc}</Text>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: SIZES.lg }]}>Recent Field Readings</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{active.details}</Text>
      </View>

      {/* Satellite Scan Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Sentinel Satellite Scan Details</Text>
        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Last Pass Date</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>July 30, 2026</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Resolution</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>10 meters per pixel</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Cloud Coverage</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>0.0% (Optimal Scan)</Text>
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
  pillsRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  pillBtn: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillBtnText: {
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
    fontSize: 24,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  metaBox: {
    gap: SIZES.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 15,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
  }
});
