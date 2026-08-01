import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function CropHealth({ theme, onNavigate }) {
  const alerts = [
    { field: 'South Field C', crop: 'Soybean', alert: 'Leaf spot warning due to high leaf humidity readings', severity: 'Medium' },
  ];

  const cropStatus = [
    { field: 'North Field A', crop: 'Maize', growthStage: 'Silking Stage', health: 'Optimal', coverage: '85%' },
    { field: 'East Field B', crop: 'Wheat', growthStage: 'Tillering Stage', health: 'Optimal', coverage: '90%' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Active Alerts Card */}
      {alerts.map((item, index) => (
        <View key={index} style={[styles.alertCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={24} color="#D97706" />
            <Text style={[styles.alertTitle, { color: '#92400E' }]}>Health Alert: {item.field}</Text>
          </View>
          <Text style={[styles.alertText, { color: '#B45309' }]}>
            {item.crop}: {item.alert}. Recommended action: Inspect leaf undersides and consider preventative bio-fungicide treatment.
          </Text>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#D97706' }]}
            onPress={() => onNavigate('AI Assistant')}
          >
            <Text style={styles.actionBtnText}>Consult AI Assistant</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Main Health Status Screen */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Crop Growth and Coverage Details</Text>
        
        {cropStatus.map((item, idx) => (
          <View key={idx} style={styles.cropRow}>
            <View style={styles.cropHeader}>
              <View style={styles.cropMeta}>
                <Text style={[styles.cropFieldName, { color: theme.text }]}>{item.field}</Text>
                <Text style={[styles.cropName, { color: theme.textSecondary }]}>{item.crop} - {item.growthStage}</Text>
              </View>
              <Text style={[styles.statusBadge, { color: theme.primary, backgroundColor: theme.primary + '15' }]}>
                {item.health}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Canopy Coverage</Text>
                <Text style={[styles.progressVal, { color: theme.text }]}>{item.coverage}</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: item.coverage }]} />
              </View>
            </View>
            {idx < cropStatus.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </View>
        ))}
      </View>

      {/* Recommended Diagnostics */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Recommended Preventative Actions</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Based on current humidity, ambient temperature, and satellite imagery vegetation indices, crop stress models indicate high pathogen development risk in dense canopy zones.
        </Text>
        <View style={styles.recommendationBox}>
          <View style={styles.recommendationItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.recommendationText, { color: theme.text }]}>Apply smart irrigation control to reduce leaf moisture duration.</Text>
          </View>
          <View style={styles.recommendationItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.recommendationText, { color: theme.text }]}>Schedule next nitrogen level index scan for North Field A.</Text>
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
  alertCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
  },
  actionBtnText: {
    color: '#FFF',
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
    marginBottom: SIZES.lg,
  },
  cropRow: {
    marginBottom: SIZES.md,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  cropMeta: {
    flex: 1,
  },
  cropFieldName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cropName: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressContainer: {
    marginBottom: SIZES.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.lg,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SIZES.lg,
  },
  recommendationBox: {
    gap: SIZES.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  recommendationText: {
    fontSize: 15,
    flex: 1,
  }
});
