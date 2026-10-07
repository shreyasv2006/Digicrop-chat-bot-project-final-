import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { getMonitorHistory, clearMonitorHistory } from '../services/apiService';

export default function AgentMonitor({ theme }) {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const loadData = () => {
    const logs = getMonitorHistory();
    setHistory(logs);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    const confirmClear = () => {
      clearMonitorHistory();
      setHistory([]);
      if (Platform.OS === 'web') alert('Agent monitor data cleared!');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all agent monitor log history?')) confirmClear();
    } else {
      Alert.alert('Clear Monitor Data', 'Are you sure you want to clear all monitor data?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: confirmClear }
      ]);
    }
  };

  const handleExport = () => {
    if (Platform.OS === 'web') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `digicrop_agent_traces_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  // Compute Stat Card metrics
  const totalRequests = history.length;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  let fallbacksCount = 0;

  // Compute Agents Table metrics: agent -> { runs: 0, totalDuration: 0, success: 0, fail: 0 }
  const agentStatsMap = {};

  history.forEach(item => {
    const usage = item.usage || {};
    totalInputTokens += usage.inputTokens || 0;
    const outToks = (usage.outputTokens || 0) + (usage.thinkingTokens || 0);
    totalOutputTokens += outToks;
    totalTokens += (usage.totalTokens || (usage.inputTokens || 0) + outToks);
    totalLatency += (usage.latencyMs || 0);

    const trace = item.trace || [];
    let hasFallback = false;
    trace.forEach(step => {
      if (step.agent === 'Fallback' || (step.agent && step.agent.toLowerCase().includes('fallback'))) {
        hasFallback = true;
      }
      const agentName = step.agent || 'Unknown Agent';
      if (!agentStatsMap[agentName]) {
        agentStatsMap[agentName] = { runs: 0, totalDuration: 0, success: 0, fail: 0 };
      }
      agentStatsMap[agentName].runs += 1;
      agentStatsMap[agentName].totalDuration += (step.durationMs || 0);
      if (step.status === 'error' || step.status === 'failed') {
        agentStatsMap[agentName].fail += 1;
      } else {
        agentStatsMap[agentName].success += 1;
      }
    });
    if (hasFallback) fallbacksCount += 1;
  });

  const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
  const agentRows = Object.keys(agentStatsMap).map(name => ({
    name,
    ...agentStatsMap[name],
    avgDuration: Math.round(agentStatsMap[name].totalDuration / agentStatsMap[name].runs)
  }));

  const latestTrace = history.length > 0 ? history[0].trace : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Action Buttons Row */}
      <View style={styles.topActionsRow}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Agent Pipeline Monitor</Text>
        <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={handleExport}>
            <Ionicons name="download-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Export JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444420', borderColor: '#EF4444', borderWidth: 1 }]} onPress={handleClear}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Clear monitor data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Requests</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{totalRequests}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Input Tokens</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{totalInputTokens}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Output Tokens</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{totalOutputTokens}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Tokens</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{totalTokens}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Latency</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{(avgLatencyMs / 1000).toFixed(2)}s</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Fallbacks Used</Text>
          <Text style={[styles.statValue, { color: fallbacksCount > 0 ? '#F59E0B' : theme.text }]}>{fallbacksCount}</Text>
        </View>
      </View>

      {/* Empty State */}
      {totalRequests === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="pulse-outline" size={44} color={theme.textSecondary} style={{ marginBottom: SIZES.sm }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No requests yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Ask something in AI Assistant to observe real-time agent execution traces and token usage.
          </Text>
        </View>
      ) : (
        <>
          {/* 2. Agents Used Table */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Agents Used</Text>
            <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.th, { flex: 2, color: theme.textSecondary }]}>Agent Name</Text>
              <Text style={[styles.th, { flex: 1, color: theme.textSecondary }]}>Runs</Text>
              <Text style={[styles.th, { flex: 1.5, color: theme.textSecondary }]}>Avg Duration</Text>
              <Text style={[styles.th, { flex: 1.5, color: theme.textSecondary }]}>Pass / Fail</Text>
            </View>
            {agentRows.map(row => (
              <View key={row.name} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.tdBold, { flex: 2, color: theme.text }]}>{row.name}</Text>
                <Text style={[styles.td, { flex: 1, color: theme.text }]}>{row.runs}</Text>
                <Text style={[styles.td, { flex: 1.5, color: theme.text }]}>{row.avgDuration} ms</Text>
                <Text style={[styles.td, { flex: 1.5, color: row.fail > 0 ? '#EF4444' : '#10B981' }]}>
                  {row.success} / {row.fail}
                </Text>
              </View>
            ))}
          </View>

          {/* 3. Live Activity Panel */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Live Pipeline Trace (Latest Response)</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>READY</Text>
              </View>
            </View>
            {latestTrace.length === 0 ? (
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginTop: 10 }]}>No step details in latest trace.</Text>
            ) : (
              <View style={{ marginTop: 12 }}>
                {latestTrace.map((step, idx) => (
                  <View key={idx} style={[styles.stepItem, { borderColor: theme.border }]}>
                    <View style={styles.stepHeader}>
                      <Ionicons 
                        name={step.status === 'ok' || step.status === 'success' ? "checkmark-circle" : "alert-circle"} 
                        size={16} 
                        color={step.status === 'ok' || step.status === 'success' ? "#10B981" : "#F59E0B"} 
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.stepAgent, { color: theme.text }]}>{step.agent}</Text>
                      <Text style={[styles.stepAction, { color: theme.primary }]}> › {step.action}</Text>
                      <Text style={[styles.stepDuration, { color: theme.textSecondary }]}> ({step.durationMs || 0}ms)</Text>
                    </View>
                    {!!step.detail && (
                      <Text style={[styles.stepDetail, { color: theme.textSecondary }]}>{step.detail}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 4. Recent Requests List */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Requests History</Text>
            {history.map((req, idx) => {
              const isExpanded = expandedId === idx;
              const dateStr = req.timestamp ? new Date(req.timestamp).toLocaleTimeString() : 'n/a';
              const usage = req.usage || {};
              const tokStr = usage.totalTokens != null ? `${usage.totalTokens} tok` : '0 tok';
              const latStr = usage.latencyMs ? `${(usage.latencyMs / 1000).toFixed(1)}s` : 'n/a';

              return (
                <View key={idx} style={[styles.reqCard, { borderColor: theme.border, backgroundColor: theme.cardBg }]}>
                  <TouchableOpacity 
                    style={styles.reqHeader} 
                    onPress={() => setExpandedId(isExpanded ? null : idx)}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.reqTopRow}>
                        <Text style={[styles.reqTime, { color: theme.textSecondary }]}>{dateStr}</Text>
                        <Text style={[styles.reqMode, { color: theme.primary }]}>[{req.mode || 'general'}]</Text>
                      </View>
                      <Text style={[styles.reqQuestion, { color: theme.text }]} numberOfLines={1}>
                        "{req.question}"
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                      <Text style={[styles.reqMetaText, { color: theme.text }]}>{tokStr}</Text>
                      <Text style={[styles.reqMetaSub, { color: theme.textSecondary }]}>{latStr}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.traceExpandBox, { borderTopColor: theme.border }]}>
                      <Text style={[styles.expandTitle, { color: theme.textSecondary }]}>Full Execution Trace Steps:</Text>
                      {(req.trace || []).map((st, i) => (
                        <View key={i} style={styles.traceSubStep}>
                          <Text style={[styles.traceSubAgent, { color: theme.primary }]}>{i + 1}. [{st.agent}]</Text>
                          <Text style={[styles.traceSubAction, { color: theme.text }]}> {st.action}</Text>
                          <Text style={[styles.traceSubDetail, { color: theme.textSecondary }]}> - {st.detail} ({st.durationMs}ms)</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
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
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 400,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tdBold: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  td: {
    fontSize: 13,
  },
  stepItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepAgent: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepDuration: {
    fontSize: 12,
  },
  stepDetail: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 24,
  },
  reqCard: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    overflow: 'hidden',
  },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
  },
  reqTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  reqTime: {
    fontSize: 11,
  },
  reqMode: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  reqQuestion: {
    fontSize: 13,
    fontWeight: '600',
  },
  reqMetaText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  reqMetaSub: {
    fontSize: 11,
  },
  traceExpandBox: {
    borderTopWidth: 1,
    padding: SIZES.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  expandTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  traceSubStep: {
    marginBottom: 4,
  },
  traceSubAgent: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  traceSubAction: {
    fontSize: 12,
  },
  traceSubDetail: {
    fontSize: 11,
  },
});
