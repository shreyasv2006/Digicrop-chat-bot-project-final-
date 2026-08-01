import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { QUICK_QUESTIONS } from '../constants/data';

export default function QuickActionCards({ theme, onSelectQuestion }) {
  const { width } = useWindowDimensions();
  
  // Calculate columns based on width
  // Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
  const getColCount = () => {
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 3;
  };

  const colCount = getColCount();
  const cardWidth = `${100 / colCount}%`;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Suggested Topics
      </Text>
      
      <View style={styles.grid}>
        {QUICK_QUESTIONS.map((item) => (
          <View key={item.id} style={[styles.cardWrapper, { width: cardWidth }]}>
            <TouchableOpacity 
              style={[
                styles.card, 
                { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.text,
                }
              ]}
              onPress={() => onSelectQuestion(item.question)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={item.icon} size={24} color={theme.primary} />
              </View>
              
              <View style={styles.textContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                  {item.desc}
                </Text>
              </View>
              
              <View style={styles.arrowIcon}>
                <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
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
    paddingBottom: SIZES.xxl,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.md,
    marginLeft: SIZES.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.sm, // Compensate for card margins
  },
  cardWrapper: {
    padding: SIZES.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    // Soft shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  arrowIcon: {
    marginLeft: SIZES.md,
    opacity: 0.5,
  }
});
