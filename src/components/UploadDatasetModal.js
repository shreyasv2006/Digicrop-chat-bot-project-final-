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

  const handleFileUpload = (event) => {
    if (Platform.OS === 'web' && event.target && event.target.files?.[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        setMarkdownContent(text);
        if (!datasetName) {
          setDatasetName(file.name.replace('.md', '').toUpperCase() + ' Dataset');
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
      setErrorMsg('Markdown Content is required.');
      return;
    }

    let rawMd = markdownContent;
    if (!rawMd.startsWith('---')) {
      rawMd = `---
name: ${datasetName}
category: ${category || 'Farm Data'}
farm_id: ${farmId || ''}
description: ${description || 'User provided dataset'}
---

${markdownContent}`;
    }

    const newDs = datasetService.addCustomDataset(rawMd, `${datasetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`);
    setErrorMsg('');
    setDatasetName('');
    setFarmId('');
    setDescription('');
    setMarkdownContent('');
    
    if (onDatasetAdded) onDatasetAdded(newDs);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text" size={24} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Add Custom .md Dataset</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Text style={{ color: '#DC2626', fontSize: 13 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {Platform.OS === 'web' && (
              <View style={styles.fileUploadBox}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Upload File (.md)</Text>
                <input 
                  type="file" 
                  accept=".md,.txt" 
                  onChange={handleFileUpload}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                    background: theme.background,
                    color: theme.text,
                    cursor: 'pointer',
                  }}
                />
              </View>
            )}

            <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. F009 Farm Dataset or Soil Hydro Matrix"
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

            <Text style={[styles.label, { color: theme.textSecondary }]}>Markdown Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="# Dataset Title&#10;Key observations, tables, sensor readings..."
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
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save Dataset</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 650,
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
  fileUploadBox: {
    marginBottom: 10,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  }
});
