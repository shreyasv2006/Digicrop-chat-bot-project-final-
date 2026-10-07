import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService, DATASET_TEMPLATES } from '../services/datasetService';

export default function UploadDatasetModal({ visible, onClose, onDatasetAdded, theme }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'template'
  const [datasetName, setDatasetName] = useState('');
  const [category, setCategory] = useState('Farm Data');
  const [farmId, setFarmId] = useState('');
  const [description, setDescription] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fileNameUploaded, setFileNameUploaded] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('farm_profile');

  const resetForm = () => {
    setDatasetName('');
    setCategory('Farm Data');
    setFarmId('');
    setDescription('');
    setMarkdownContent('');
    setErrorMsg('');
    setSuccessMsg('');
    setFileNameUploaded('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateFileExtension = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['md', 'csv', 'txt'].includes(ext);
  };

  const handleFileUpload = (event) => {
    if (Platform.OS === 'web' && event.target && event.target.files?.[0]) {
      const file = event.target.files[0];
      if (!validateFileExtension(file.name)) {
        setErrorMsg('Invalid file format. Please upload a .md, .csv, or .txt file.');
        return;
      }

      setErrorMsg('');
      setIsProcessing(true);
      setFileNameUploaded(file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        setMarkdownContent(text);
        
        const farmMatch = text.match(/farm_id:\s*(F[0-9]{3}|F00[0-9])|\bF[0-9]{3}\b|\bF00[0-9]\b/i);
        if (farmMatch && !farmId) {
          const matchedFarm = (farmMatch[1] || farmMatch[0]).toUpperCase();
          setFarmId(matchedFarm);
        }

        if (!datasetName) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
          setDatasetName(cleanName);
        }

        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadTemplate = () => {
    const tmpl = DATASET_TEMPLATES[selectedTemplateKey];
    if (tmpl) {
      setDatasetName(tmpl.title);
      setMarkdownContent(tmpl.content);
      setFileNameUploaded(`template_${selectedTemplateKey}.${tmpl.extension}`);
      setSuccessMsg(`Loaded template: ${tmpl.title}`);
    }
  };

  const handleSave = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!datasetName.trim()) {
      setErrorMsg('Dataset Title is required.');
      return;
    }
    if (!markdownContent.trim()) {
      setErrorMsg('Content is required. Please upload a file, paste text, or select a template.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        let rawMd = markdownContent;
        if (!rawMd.startsWith('---') && !fileNameUploaded.endsWith('.csv')) {
          rawMd = `---
name: ${datasetName.trim()}
category: ${category.trim() || 'Farm Data'}
farm_id: ${farmId.trim() || ''}
description: ${description.trim() || 'Custom uploaded dataset.'}
---

${markdownContent.trim()}`;
        }

        const cleanFileName = fileNameUploaded || `${datasetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
        const newDs = datasetService.addCustomDataset(rawMd, cleanFileName, activeTab === 'paste');
        
        setIsProcessing(false);
        setSuccessMsg(`✅ ${newDs.name} added successfully (${newDs.chunkCount} chunks indexed)!`);

        setTimeout(() => {
          if (onDatasetAdded) onDatasetAdded(newDs);
          handleClose();
        }, 800);
      } catch (err) {
        setIsProcessing(false);
        setErrorMsg(`Failed to index dataset: ${err.message}`);
      }
    }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Add & Index Custom Dataset</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'upload' && { borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab('upload')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'upload' ? theme.primary : theme.textSecondary }]}>
                📁 Upload File
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'paste' && { borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab('paste')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'paste' ? theme.primary : theme.textSecondary }]}>
                ✏️ Paste Text
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'template' && { borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab('template')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'template' ? theme.primary : theme.textSecondary }]}>
                📋 Templates
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={[styles.alertBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={[styles.alertBox, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#047857" style={{ marginRight: 6 }} />
                <Text style={{ color: '#047857', fontSize: 13, fontWeight: 'bold', flex: 1 }}>{successMsg}</Text>
              </View>
            ) : null}

            {/* TAB 1: FILE UPLOAD */}
            {activeTab === 'upload' && (
              <View style={[styles.uploadBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Ionicons name="cloud-upload-outline" size={28} color={theme.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.uploadBoxTitle, { color: theme.text }]}>Select Dataset File (.md, .csv, .txt)</Text>
                <Text style={[styles.uploadBoxDesc, { color: theme.textSecondary }]}>
                  Upload raw telemetry CSV, Markdown knowledge guides, or field notes.
                </Text>

                {Platform.OS === 'web' && (
                  <input 
                    type="file" 
                    accept=".md,.csv,.txt"
                    onChange={handleFileUpload}
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`,
                      background: theme.surface,
                      color: theme.text,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  />
                )}
                {fileNameUploaded ? (
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600', marginTop: 8 }}>
                    📄 Loaded File: {fileNameUploaded}
                  </Text>
                ) : null}
              </View>
            )}

            {/* TAB 3: TEMPLATES */}
            {activeTab === 'template' && (
              <View style={[styles.templateBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Select Recommended Dataset Template:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {Object.keys(DATASET_TEMPLATES).map((key) => {
                    const tmpl = DATASET_TEMPLATES[key];
                    const isSel = selectedTemplateKey === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.tmplChip,
                          { 
                            backgroundColor: isSel ? theme.primary : theme.surface,
                            borderColor: isSel ? theme.primary : theme.border
                          }
                        ]}
                        onPress={() => setSelectedTemplateKey(key)}
                      >
                        <Text style={{ color: isSel ? '#FFF' : theme.text, fontSize: 12, fontWeight: isSel ? 'bold' : '500' }}>
                          {tmpl.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity 
                  style={[styles.loadTmplBtn, { backgroundColor: theme.primary }]}
                  onPress={handleLoadTemplate}
                >
                  <Ionicons name="download-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Load Selected Template</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* COMMON FORM FIELDS */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. F007 Farm Telemetry or Grape Pathology Guide"
              placeholderTextColor={theme.textSecondary}
              value={datasetName}
              onChangeText={setDatasetName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. Telemetry / Agronomy"
                  placeholderTextColor={theme.textSecondary}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Farm ID (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. F007"
                  placeholderTextColor={theme.textSecondary}
                  value={farmId}
                  onChangeText={setFarmId}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="# Dataset Title&#10;Paste observations, sensor readings, soil metrics, or CSV content..."
              placeholderTextColor={theme.textSecondary}
              value={markdownContent}
              onChangeText={setMarkdownContent}
              multiline
              numberOfLines={6}
            />

            <Text style={[styles.tipText, { color: theme.textSecondary }]}>
              💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> Use clear headings, one topic per section, include units and dates, keep farm IDs consistent.
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={handleClose}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: theme.primary }]} 
              onPress={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="flash-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              )}
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                {isProcessing ? 'Indexing...' : 'Index & Save Dataset'}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SIZES.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: SIZES.sm,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    paddingVertical: 4,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  uploadBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadBoxDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  templateBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  tmplChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  loadTmplBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tipText: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
  }
});
