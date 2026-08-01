import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function DashboardOverview({ theme, onNavigate, isDesktop }) {
  const { width } = useWindowDimensions();

  const getColCount = () => {
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 4;
  };

  const colCount = getColCount();
  const cardWidth = `${100 / colCount}%`;

  const stats = [
    { title: 'Weather Today', value: '24°C', desc: 'Partly Cloudy', icon: 'partly-sunny', target: 'Weather Insights' },
    { title: 'Crop Health Status', value: 'Optimal', desc: 'All fields healthy', icon: 'leaf', target: 'Crop Health' },
    { title: 'Soil Moisture', value: '42%', desc: 'Optimal level', icon: 'earth', target: 'Soil Analysis' },
    { title: 'Average NDVI', value: '0.78', desc: 'Dense green vegetation', icon: 'stats-chart', target: 'Vegetation Indices' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={[styles.welcomeBanner, { backgroundColor: theme.primary + '10', borderColor: theme.border }]}>
        <View style={styles.welcomeTextContainer}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome to AgriSense AI</Text>
          <Text style={[styles.welcomeDesc, { color: theme.textSecondary }]}>
            Your central hub for precision agriculture metrics, crop diagnostics, and real-time intelligence.
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.chatBtn, { backgroundColor: theme.primary }]}
          onPress={() => onNavigate('AI Assistant')}
        >
          <Text style={styles.chatBtnText}>Ask AI Assistant</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Grid Stats */}
      <View style={styles.grid}>
        {stats.map((item, index) => (
          <View key={index} style={[styles.cardWrapper, { width: cardWidth }]}>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => onNavigate(item.target)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={item.icon} size={24} color={theme.primary} />
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{item.value}</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Detailed Insights Section */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Fields Status Summary</Text>
          <TouchableOpacity onPress={() => onNavigate('Crop Health')}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>View Fields Details</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Field Name</Text>
          <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Crop</Text>
          <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Health Index</Text>
          <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Condition</Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.tableRow}>
          <Text style={[styles.tableText, { color: theme.text }]}>North Field A</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>Maize</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>0.81 (NDVI)</Text>
          <Text style={[styles.statusBadge, { color: theme.primary, backgroundColor: theme.primary + '15' }]}>Optimal</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableText, { color: theme.text }]}>East Field B</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>Wheat</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>0.74 (NDVI)</Text>
          <Text style={[styles.statusBadge, { color: theme.primary, backgroundColor: theme.primary + '15' }]}>Optimal</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableText, { color: theme.text }]}>South Field C</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>Soybean</Text>
          <Text style={[styles.tableText, { color: theme.text }]}>0.65 (NDVI)</Text>
          <Text style={[styles.statusBadge, { color: '#D97706', backgroundColor: '#FEF3C7' }]}>Attention</Text>
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
  welcomeBanner: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
    gap: SIZES.md,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
  },
  welcomeDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  chatBtn: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.sm,
    marginBottom: SIZES.lg,
  },
  cardWrapper: {
    padding: SIZES.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
  },
  section: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
  },
  tableLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  tableText: {
    flex: 1,
    fontSize: 15,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  }
});
