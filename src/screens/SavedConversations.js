import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getSavedConversationsFromStorage } from '../services/datasetData';

export default function SavedConversations({ theme, onNavigate }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    const saved = getSavedConversationsFromStorage();
    setList(saved);
  }, []);

  if (list.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Conversations</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            You haven't saved any AI chat sessions yet. You can save answers or discussions from the AI Assistant tab to review them here later.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => onNavigate && onNavigate('AI Assistant')}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Go to AI Assistant</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {list.map((item, index) => (
        <TouchableOpacity
          key={item.id || index}
          style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => onNavigate && onNavigate('AI Assistant')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleWrapper}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title || 'Saved Chat Session'}
              </Text>
            </View>
            <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.date || ''}</Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.desc || item.preview || ''}
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

