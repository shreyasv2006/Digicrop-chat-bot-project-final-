import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';

export default function AuditLogModal({ visible, onClose, theme }) {
  const auditLogs = [
    { id: '1', time: '11:45:02 AM', type: 'RAG Grounding', status: 'PASS (0.00% Loss)', detail: 'F001 Telemetry verified against Sentinel-2 L2A' },
    { id: '2', time: '11:42:15 AM', type: 'Anti-Hallucination', status: 'ENFORCED', detail: 'Short-circuited unindexed farm query F999' },
    { id: '3', time: '11:38:10 AM', type: 'Primary Inference', status: 'ONLINE', detail: 'Groq API (openai/gpt-oss-120b) Latency: 284ms' },
    { id: '4', time: '11:30:00 AM', type: 'IoT Gateway Sync', status: 'SYNCED', detail: '6 / 6 Hubs Online • 2,410 Sensor readings updated' },
    { id: '5', time: '11:15:22 AM', type: 'Model Guardrails', status: 'ACTIVE', detail: 'Deterministic Temperature 0.10 System Instruction Lockdown' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={22} color={theme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>DigiCrop Security & Audit Log</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {auditLogs.map((log) => (
              <View key={log.id} style={[styles.logCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.logHeaderRow}>
                  <Text style={[styles.logType, { color: theme.text }]}>{log.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.statusText, { color: theme.primary }]}>{log.status}</Text>
                  </View>
                </View>
                <Text style={[styles.logDetail, { color: theme.textSecondary }]}>{log.detail}</Text>
                <Text style={[styles.logTime, { color: theme.textSecondary }]}>{log.time}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.primary }]} onPress={onClose}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close Audit Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '85%',
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    paddingVertical: SIZES.md,
  },
  logCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logType: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  logDetail: {
    fontSize: 12,
    marginBottom: 4,
  },
  logTime: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  }
});
