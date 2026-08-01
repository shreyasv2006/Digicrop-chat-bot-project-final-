import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function SavedConversations({ theme, onNavigate }) {
  const list = [
    { title: 'NDVI Index details for Wheat field A', date: 'July 30, 2026', desc: 'Detailed explanation regarding nitrogen absorption and infrared reflectivity.' },
    { title: 'Water stress mitigation guidelines', date: 'July 28, 2026', desc: 'Soil moisture threshold instructions and irrigation cycle calculation recommendations.' },
    { title: 'Growing Degree Days baseline calculation', date: 'July 22, 2026', desc: 'Maize thermal accumulative models using base baseline temperature parameter.' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {list.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => onNavigate('AI Assistant')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleWrapper}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.date}</Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.desc}
          </Text>
          <View style={styles.footerRow}>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Resume Chat</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.primary} />
          </View>
        </TouchableOpacity>
      ))}
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
  itemCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  titleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  cardDate: {
    fontSize: 12,
    marginLeft: SIZES.sm,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SIZES.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  }
});
