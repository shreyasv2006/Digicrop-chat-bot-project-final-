import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getSavedConversationsFromStorage, deleteSavedConversation } from '../services/datasetData';
import { confirmDialog, showToast } from '../services/dialogService';

export default function SavedConversations({ theme, onNavigate }) {
  const [list, setList] = useState([]);

  const reloadSaved = () => {
    setList(getSavedConversationsFromStorage());
  };

  useEffect(() => {
    reloadSaved();
  }, []);

  const handleCopy = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete Saved Item',
      message: 'Are you sure you want to delete this saved item?',
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (ok) {
      deleteSavedConversation(id);
      reloadSaved();
      showToast('Saved item removed', 'info');
    }
  };


  if (list.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Conversations</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            You haven't saved any AI chat sessions yet. You can click "Save Answer" during an AI Assistant chat to review them here later.
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
      {list.map((item) => (
        <View
          key={item.id}
          style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleWrapper}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title || 'Saved Answer'}
              </Text>
            </View>
            <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.date || ''}</Text>
          </View>

          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={4}>
            {item.desc || ''}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.primary + '15' }]} 
              onPress={() => onNavigate && onNavigate('AI Assistant')}
            >
              <Ionicons name="arrow-forward" size={14} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Open Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.border }]} 
              onPress={() => handleCopy(item.desc)}
            >
              <Ionicons name="copy-outline" size={14} color={theme.text} />
              <Text style={{ color: theme.text, fontSize: 12 }}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: '#EF444415' }]} 
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 12 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  actionRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  }
});
