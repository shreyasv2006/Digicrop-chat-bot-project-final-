import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService } from '../services/datasetService';

export default function UploadDatasetModal({ visible, onClose, onDatasetAdded, theme }) {
  const [datasetName, setDatasetName] = useState('');
  const [category, setCategory] = useState('Farm Data');
  const [farmId, setFarmId] = useState('');
  const [description, setDescription] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileNameUploaded, setFileNameUploaded] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileUpload = (event) => {
    if (Platform.OS === 'web' && event.target && event.target.files?.[0]) {
      const file = event.target.files[0];
      setFileNameUploaded(file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        setMarkdownContent(text);
        
        // Auto-extract Farm ID if present (e.g. F009)
        const farmMatch = text.match(/farm_id:\s*(F[0-9]{3}|F00[0-9])|F[0-9]{3}|F00[0-9]/i);
        if (farmMatch && !farmId) {
          const matchedFarm = (farmMatch[1] || farmMatch[0]).toUpperCase();
          setFarmId(matchedFarm);
        }

        if (!datasetName) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase().replace(/[^A-Z0-9_\-\s]/g, ' ');
          setDatasetName(cleanName + ' Dataset');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = () => {
    if (!datasetName.trim()) {
      setErrorMsg('Dataset Name is required.');
      return;
    }
    if (!markdownContent.trim()) {
      setErrorMsg('Dataset content is required. Please paste text or select a file.');
      return;
    }

    let rawMd = markdownContent;
    if (!rawMd.startsWith('---')) {
      rawMd = `---
name: ${datasetName.trim()}
category: ${category.trim() || 'Farm Data'}
farm_id: ${farmId.trim() || ''}
description: ${description.trim() || 'Custom uploaded knowledge dataset.'}
---

${markdownContent.trim()}`;
    }

    const cleanFileName = (fileNameUploaded || datasetName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.md');
    const newDs = datasetService.addCustomDataset(rawMd, cleanFileName);
    
    setErrorMsg('');
    setIsSuccess(true);

    setTimeout(() => {
      setDatasetName('');
      setFarmId('');
      setDescription('');
      setMarkdownContent('');
      setFileNameUploaded('');
      setIsSuccess(false);

      if (onDatasetAdded) onDatasetAdded(newDs);
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={22} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Train & Add Custom Dataset</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {isSuccess ? (
              <View style={[styles.errorBox, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#047857" style={{ marginRight: 8 }} />
                <Text style={{ color: '#047857', fontSize: 14, fontWeight: 'bold' }}>
                  ✅ Dataset Trained & Loaded into DigiCrop AI!
                </Text>
              </View>
            ) : null}

            {/* Universal File Upload Box */}
            <View style={[styles.fileUploadCard, { backgroundColor: theme.background, borderColor: theme.primary + '40' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="cloud-upload-outline" size={20} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.label, { color: theme.text, marginTop: 0, marginBottom: 0 }]}>
                  Upload File (.md, .txt, .csv, .json, docs)
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
                Select any markdown, text, or data file from your computer to train DigiCrop AI on the spot:
              </Text>
              
              {Platform.OS === 'web' && (
                <input 
                  type="file" 
                  accept="*/*"
                  onChange={handleFileUpload}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                    background: theme.surface,
                    color: theme.text,
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '13px',
                  }}
                />
              )}
              {fileNameUploaded ? (
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600', marginTop: 6 }}>
                  📄 Loaded File: {fileNameUploaded}
                </Text>
              ) : null}
            </View>

            {/* Dataset Form Inputs */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Title / Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. F009 Farm Telemetry or Soil Nitrogen Protocol"
              placeholderTextColor={theme.textSecondary}
              value={datasetName}
              onChangeText={setDatasetName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. Farm Data"
                  placeholderTextColor={theme.textSecondary}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Farm ID (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. F009"
                  placeholderTextColor={theme.textSecondary}
                  value={farmId}
                  onChangeText={setFarmId}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Brief summary of what this dataset contains..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Content / Markdown Text *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="# Dataset Title&#10;Paste observations, sensor readings, soil metrics, or farm notes here..."
              placeholderTextColor={theme.textSecondary}
              value={markdownContent}
              onChangeText={setMarkdownContent}
              multiline
              numberOfLines={8}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Ionicons name="flash-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Train AI & Save Dataset</Text>
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
    maxWidth: 680,
    maxHeight: '90%',
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  fileUploadCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  }
});
