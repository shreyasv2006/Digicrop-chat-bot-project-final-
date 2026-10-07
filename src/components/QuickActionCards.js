import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService } from '../services/datasetService';

export default function QuickActionCards({ theme, onSelectQuestion }) {
  const { width } = useWindowDimensions();
  const farmIds = datasetService.getLoadedFarmIds();

  const getColCount = () => {
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 3;
  };

  const colCount = getColCount();
  const cardWidth = `${100 / colCount}%`;

  // Dynamically generate cards based on loaded farm datasets
  const cards = [];

  if (farmIds.includes('F001')) {
    cards.push({
      id: 'f001_moisture',
      icon: 'water-outline',
      title: 'F001 Soil Moisture',
      question: 'What is the soil moisture of F001?',
      desc: 'Query root-zone moisture for Farm F001',
    });
    cards.push({
      id: 'f001_ndvi',
      icon: 'analytics-outline',
      title: 'F001 NDVI Canopy Status',
      question: 'What is the NDVI of F001?',
      desc: 'Check vegetation index for Farm F001',
    });
  }

  if (farmIds.includes('F004')) {
    cards.push({
      id: 'f004_status',
      icon: 'leaf-outline',
      title: 'F004 Crop Health',
      question: 'What is the status of F004?',
      desc: 'Inspect Pune Wheat plot telemetry',
    });
  }

  if (farmIds.includes('F001') && farmIds.includes('F004')) {
    cards.push({
      id: 'compare_farms',
      icon: 'git-compare-outline',
      title: 'Compare F001 and F004',
      question: 'Compare F001 and F004 using their datasets.',
      desc: 'Comparative analysis across monitored plots',
    });
  }

  // Add custom farm cards if new farms are loaded
  farmIds.forEach(fid => {
    if (fid !== 'F001' && fid !== 'F004') {
      cards.push({
        id: `farm_${fid}`,
        icon: 'location-outline',
        title: `${fid} Farm Status`,
        question: `What is the status of ${fid}?`,
        desc: `Check telemetry data for farm ${fid}`,
      });
    }
  });

  // General Agriculture Fallbacks if no farm datasets
  cards.push({
    id: 'gen_ndvi',
    icon: 'planet-outline',
    title: 'What is NDVI?',
    question: 'How does NDVI work in remote sensing?',
    desc: 'General vegetation index principles',
  });
  cards.push({
    id: 'gen_soil',
    icon: 'earth-outline',
    title: 'Soil Salinity (EC)',
    question: 'How does high soil EC affect plant growth?',
    desc: 'Understanding electrical conductivity',
  });
  cards.push({
    id: 'gen_drip',
    icon: 'water-outline',
    title: 'Drip Irrigation Tips',
    question: 'What are the best irrigation schedules for grape vines?',
    desc: 'Water management best practices',
  });

  const displayCards = cards.slice(0, 6);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Suggested Topics
      </Text>
      
      <View style={styles.grid}>
        {displayCards.map((item) => (
          <View key={item.id} style={[styles.cardWrapper, { width: cardWidth }]}>
            <TouchableOpacity 
              style={[
                styles.card, 
                { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }
              ]}
              onPress={() => onSelectQuestion(item.question)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={item.icon} size={22} color={theme.primary} />
              </View>
              
              <View style={styles.textContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.desc}
                </Text>
              </View>
              
              <View style={styles.arrowIcon}>
                <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.md,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cardWrapper: {
    padding: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 84,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  arrowIcon: {
    marginLeft: 8,
    opacity: 0.5,
  }
});
