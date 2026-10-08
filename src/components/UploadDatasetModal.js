import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import datasetService from '../services/datasetService';

function generateSafeDatasetId(name) {
  return `ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
import { alertDialog, showToast } from '../services/dialogService';

import { readFileWithEncodingFallback, detectFormatByContent, parseRFC4180Batched, detectFields, chunkTableData } from '../services/datasetIngest';
import { saveDataset } from '../services/datasetStore';

export default function UploadDatasetModal({ visible, onClose, theme }) {
  const [file, setFile] = useState(null);
  const [fileSizeFormatted, setFileSizeFormatted] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const cancelRef = useRef({ isCancelled: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setFile(null);
      setFileSizeFormatted('');
      setIsProcessing(false);
      setProgressMsg('');
      setProgressPercent(0);
      cancelRef.current.isCancelled = false;
    }
  }, [visible]);

  const handlePickFile = (e) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const validateAndSetFile = (f) => {
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['csv', 'tsv', 'txt', 'md'].includes(ext)) {
      alertDialog({ title: 'Invalid File', message: 'Only .csv, .tsv, .txt, and .md files are supported.' });
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      alertDialog({ title: 'File Too Large', message: 'File exceeds maximum size of 25 MB.' });
      return;
    }
    setFile(f);
    setFileSizeFormatted(f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(f.size / 1024)} KB`);
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleCancel = () => {
    if (isProcessing) {
      cancelRef.current.isCancelled = true;
      setProgressMsg('Canceling...');
    } else {
      onClose();
    }
  };

  const handleAddDataset = async () => {
    if (!file) return;
    setIsProcessing(true);
    cancelRef.current.isCancelled = false;
    setProgressMsg('Reading file...');
    setProgressPercent(0);

    const dsId = generateSafeDatasetId(file.name);
    
    // Check duplicates
    const all = datasetService.getAllDatasets();
    if (all.some(d => d.name === file.name || d.id === dsId)) {
      const ok = window.confirm(`Dataset "${file.name}" already exists. Replace it?`);
      if (!ok) {
        setIsProcessing(false);
        return;
      }
    }

    try {
      // 1. Read
      let watchdog = setTimeout(() => { throw new Error('Reading file timed out'); }, 30000);
      const text = await readFileWithEncodingFallback(file);
      clearTimeout(watchdog);
      if (cancelRef.current.isCancelled) throw new Error('Canceled');
      setProgressPercent(10);
      
      // 2. Detect
      setProgressMsg('Detecting format...');
      const { type, delimiter, cols } = detectFormatByContent(text);
      if (type === 'Plain Text' || cols < 2) {
        throw new Error('File does not appear to be a structured table (CSV/Markdown).');
      }
      
      // 3. Parse
      setProgressMsg(`Parsing ${type} (${cols} columns)...`);
      watchdog = setTimeout(() => { cancelRef.current.isCancelled = true; }, 60000); // 60s parse limit
      const { headers, rows } = await parseRFC4180Batched(text, delimiter, (p) => {
        setProgressPercent(p.percent);
        setProgressMsg(`Parsing rows...`);
      }, cancelRef.current);
      clearTimeout(watchdog);
      if (cancelRef.current.isCancelled) throw new Error('Canceled');
      if (rows.length === 0) throw new Error('File contains no data rows.');
      
      // 4. Fields & Meta
      const detectedFields = detectFields(headers);
      const meta = {
        id: dsId,
        name: file.name,
        size: file.size,
        type,
        columns: headers.join(', '),
        detectedFields,
        rowCount: rows.length,
        rowObjects: rows.slice(0, 1000), // save 1000 preview rows for dashboard access
        addedAt: new Date().toISOString()
      };
      
      // 5. Chunk
      setProgressMsg('Chunking data...');
      const chunks = await chunkTableData(dsId, headers, rows, (p) => {
        setProgressPercent(p.percent);
        setProgressMsg(`Chunking rows...`);
      }, cancelRef.current);
      if (cancelRef.current.isCancelled) throw new Error('Canceled');
      meta.chunkCount = chunks.length;

      // Row blocks for dashboard (1000 per block)
      const rowBlocks = [];
      for (let i = 0; i < rows.length; i += 1000) {
        rowBlocks.push({
          id: `${dsId}_block_${i}`,
          datasetId: dsId,
          rows: rows.slice(i, i + 1000)
        });
      }
      
      // 6. Save
      setProgressMsg('Saving to database...');
      setProgressPercent(95);
      watchdog = setTimeout(() => { cancelRef.current.isCancelled = true; }, 30000);
      await saveDataset(meta, chunks, rowBlocks);
      clearTimeout(watchdog);
      if (cancelRef.current.isCancelled) throw new Error('Canceled');
      
      setProgressPercent(100);
      setProgressMsg('Done!');
      
      // 7. Register
      datasetService.registerNewDataset(meta);
      showToast(`${file.name} added (${rows.length} rows)`, 'success');
      onClose();

    } catch (err) {
      if (err.message === 'Canceled') {
        setProgressMsg('');
        setIsProcessing(false);
      } else {
        alertDialog({ title: 'Error Adding Dataset', message: err.message });
        setIsProcessing(false);
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Add Dataset</Text>
            <TouchableOpacity onPress={handleCancel} disabled={isProcessing}>
              <Ionicons name="close" size={24} color={isProcessing ? theme.textSecondary : theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {!file ? (
              <View 
                style={[styles.dropZone, { borderColor: theme.border }]} 
                onDragOver={handleDragOver} 
                onDrop={handleDrop}
              >
                <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.dropText, { color: theme.textSecondary }]}>Drag and drop a .csv, .tsv, or .md file here</Text>
                <TouchableOpacity 
                  style={[styles.chooseBtn, { backgroundColor: theme.primary }]}
                  onPress={() => { if (Platform.OS === 'web') fileInputRef.current?.click(); }}
                >
                  <Text style={styles.chooseBtnText}>Choose File</Text>
                </TouchableOpacity>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".csv,.tsv,.txt,.md" 
                  onChange={handlePickFile} 
                />
              </View>
            ) : (
              <View style={[styles.fileCard, { borderColor: theme.border }]}>
                <Ionicons name="document" size={32} color={theme.primary} />
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{file.name}</Text>
                  <Text style={[styles.fileSize, { color: theme.textSecondary }]}>{fileSizeFormatted}</Text>
                </View>
                {!isProcessing && (
                  <TouchableOpacity onPress={() => setFile(null)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isProcessing && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                  <Text style={[styles.progressMsg, { color: theme.text }]}>{progressMsg}</Text>
                  <Text style={[styles.progressPct, { color: theme.primary }]}>{progressPercent}%</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${Math.max(5, progressPercent)}%` }]} />
                </View>
              </View>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: theme.border }]} 
              onPress={handleCancel}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: file && !isProcessing ? theme.primary : theme.border }]} 
              onPress={handleAddDataset}
              disabled={!file || isProcessing}
            >
              <Text style={[styles.addBtnText, { color: file && !isProcessing ? '#FFF' : theme.textSecondary }]}>
                {isProcessing ? 'Processing...' : 'Add Dataset'}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.md,
  },
  modalBox: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    padding: SIZES.lg,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: SIZES.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
    fontSize: 14,
    textAlign: 'center',
  },
  chooseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  chooseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZES.md,
  },
  fileInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: SIZES.xl,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressMsg: {
    fontSize: 13,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SIZES.lg,
    borderTopWidth: 1,
    gap: SIZES.md,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addBtnText: {
    fontWeight: 'bold',
  }
});
