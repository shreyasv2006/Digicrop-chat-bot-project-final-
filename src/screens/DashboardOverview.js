import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService } from '../services/datasetService';
import { getRealFarms, getRealAlerts, getThresholdStatus, getRecentActivity } from '../services/datasetData';

export default function DashboardOverview({ theme, onNavigate, onOpenUploadModal }) {
  const { width } = useWindowDimensions();
  const [datasets, setDatasets] = useState([]);
  const [realFarms, setRealFarms] = useState([]);
  const [realAlerts, setRealAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const loadData = () => {
    const ds = datasetService.getAllDatasets();
    setDatasets(ds);
    setRealFarms(getRealFarms());
    setRealAlerts(getRealAlerts());
    setRecentActivity(getRecentActivity());
  };

  useEffect(() => {
    loadData();
    const unsub = datasetService.subscribe(loadData);
    return () => unsub();
  }, []);

  const getColCount = () => {
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 3;
  };

  const colCount = getColCount();
  const cardWidth = `${100 / colCount}%`;

  const uploadedCount = datasets.filter(d => d.source === 'Uploaded').length;
  const pastedCount = datasets.filter(d => d.source === 'Pasted').length;

  const realStats = [
    { 
      title: 'Loaded Datasets', 
      value: `${datasets.length}`, 
      desc: datasets.length > 0 ? `${uploadedCount} Uploaded • ${pastedCount} Pasted` : 'No datasets loaded', 
      icon: 'document-text-outline', 
      target: 'AI Assistant' 
    },
    { 
      title: 'Monitored Farms', 
      value: `${realFarms.length}`, 
      desc: realFarms.length > 0 ? `${realFarms.length} Farms Detected` : 'No farm records found', 
      icon: 'location-outline', 
      target: 'Crop Health' 
    },
    { 
      title: 'Active Alerts', 
      value: `${realAlerts.length}`, 
      desc: realAlerts.length > 0 ? `${realAlerts.filter(a=>a.severity==='Critical').length} Critical Warnings` : 'Zero active alerts', 
      icon: 'warning-outline', 
      target: 'Crop Health' 
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={[styles.welcomeBanner, { backgroundColor: theme.primary + '10', borderColor: theme.border }]}>
        <View style={styles.welcomeTextContainer}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>DigiCrop AI Intelligence</Text>
          <Text style={[styles.welcomeDesc, { color: theme.textSecondary }]}>
            Precision agriculture telemetry, dataset grounding, and agronomy intelligence.
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
        {realStats.map((item, index) => (
          <View key={index} style={[styles.cardWrapper, { width: cardWidth }]}>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => onNavigate(item.target)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={item.icon} size={22} color={theme.primary} />
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{item.value}</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Recent Activity List (Hide if empty) */}
      {recentActivity.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>Recent Activity</Text>
          {recentActivity.map((act) => (
            <View key={act.id} style={styles.activityRow}>
              <Ionicons name="time-outline" size={14} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.activityText, { color: theme.text }]}>{act.text}</Text>
              <Text style={[styles.activityTime, { color: theme.textSecondary }]}>{act.time}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Real Farm Telemetry Table */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Monitored Farms Telemetry</Text>
          <TouchableOpacity onPress={() => onNavigate('Crop Health')}>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>View Crop Health</Text>
          </TouchableOpacity>
        </View>
        
        {realFarms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-upload-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No farm telemetry loaded. Add a dataset to see farm metrics.
            </Text>
            <TouchableOpacity onPress={onOpenUploadModal} style={{ marginTop: 8 }}>
              <Text style={{ color: theme.primary, textDecorationLine: 'underline', fontSize: 13, fontWeight: '500' }}>
                Use Add Dataset in the sidebar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Farm ID & Name</Text>
              <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Crop</Text>
              <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>NDVI</Text>
              <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>Soil Moisture</Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {realFarms.map((farm) => {
              const ndviStatus = farm.ndvi !== null ? getThresholdStatus(farm.ndvi, 'ndvi') : null;
              return (
                <View key={farm.id} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableTextBold, { color: theme.text }]}>{farm.id}</Text>
                    <Text style={[styles.tableSubtext, { color: theme.textSecondary }]}>{farm.name}</Text>
                  </View>
                  <Text style={[styles.tableText, { color: theme.text }]}>{farm.crop || 'N/A'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableText, { color: theme.text }]}>
                      {farm.ndvi !== null ? `${farm.ndvi}` : 'N/A'}
                    </Text>
                    {ndviStatus && (
                      <Text style={[styles.statusBadge, { color: ndviStatus.color, backgroundColor: ndviStatus.color + '15' }]}>
                        {ndviStatus.label}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tableText, { color: theme.text }]}>
                    {farm.soilMoisture !== null ? `${farm.soilMoisture}%` : 'N/A'}
                  </Text>
                </View>
              );
            })}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
    gap: SIZES.md,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatBtn: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: SIZES.lg,
  },
  cardWrapper: {
    padding: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 11,
  },
  section: {
    borderWidth: 1,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  tableTextBold: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableSubtext: {
    fontSize: 11,
  },
  tableText: {
    flex: 1,
    fontSize: 13,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 12,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  activityText: {
    flex: 1,
    fontSize: 13,
  },
  activityTime: {
    fontSize: 11,
  }
});
