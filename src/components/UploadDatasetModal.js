import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { datasetService, DATASET_TEMPLATES } from '../services/datasetService';
import { decodeFileBuffer } from '../services/datasetParser';
import { alertDialog, choiceDialog, showToast } from '../services/dialogService';

const OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'hin', label: 'Hindi' },
  { code: 'mar', label: 'Marathi' },
  { code: 'kan', label: 'Kannada' },
];

export default function UploadDatasetModal({
  visible,
  onClose,
  onDatasetAdded,
  theme,
  initialFile = null,
}) {
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

  // OCR specific state
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [ocrProgressPercent, setOcrProgressPercent] = useState(0);
  const [ocrProgressMessage, setOcrProgressMessage] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState(null); // number or 'n/a'
  const [isOcrReviewStep, setIsOcrReviewStep] = useState(false);
  const [indexProgress, setIndexProgress] = useState(null);
  const [detectedFileType, setDetectedFileType] = useState('Structured CSV Telemetry');
  const [fileSizeFormatted, setFileSizeFormatted] = useState('');

  const cancelRef = useRef(false);
  const cancelTokenRef = useRef({ isCancelled: false });
  const watchdogRef = useRef(null);
  const activeWorkerRef = useRef(null);
  const fullContentRef = useRef('');
  const lastUiUpdateRef = useRef(0);

  useEffect(() => {
    if (initialFile && visible) {
      processSelectedFile(initialFile);
    }
  }, [initialFile, visible]);

  const resetForm = () => {
    cancelRef.current = true;
    if (cancelTokenRef.current) cancelTokenRef.current.isCancelled = true;
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (activeWorkerRef.current) {
      try {
        activeWorkerRef.current.terminate();
      } catch (e) {}
      activeWorkerRef.current = null;
    }
    fullContentRef.current = '';
    setDatasetName('');
    setCategory('Farm Data');
    setFarmId('');
    setDescription('');
    setMarkdownContent('');
    setErrorMsg('');
    setSuccessMsg('');
    setFileNameUploaded('');
    setDetectedFileType('Structured CSV Telemetry');
    setFileSizeFormatted('');
    setIndexProgress(null);
    setIsProcessing(false);
    setIsOcrMode(false);
    setOcrProgressPercent(0);
    setOcrProgressMessage('');
    setOcrConfidence(null);
    setIsOcrReviewStep(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCancelOcr = () => {
    cancelRef.current = true;
    if (activeWorkerRef.current) {
      try {
        activeWorkerRef.current.terminate();
      } catch (e) {}
      activeWorkerRef.current = null;
    }
    setIsProcessing(false);
    setIsOcrMode(false);
    setOcrProgressMessage('');
    setErrorMsg('OCR processing was cancelled.');
  };

  const isImageFile = (name) => {
    return /\.(png|jpe?g|webp)$/i.test(name);
  };

  const isPdfFile = (name) => {
    return /\.pdf$/i.test(name);
  };

  const processSelectedFile = async (file) => {
    if (!file) return;
    setErrorMsg('');
    setSuccessMsg('');
    cancelRef.current = false;
    setFileNameUploaded(file.name);

    if (!datasetName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      setDatasetName(cleanName);
    }

    // 1. Image OCR handling
    if (isImageFile(file.name)) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image exceeds 10 MB limit. Please select an image under 10 MB.');
        return;
      }
      await runImageOcr(file);
      return;
    }

    // 2. PDF handling (Text layer or OCR fallback)
    if (isPdfFile(file.name)) {
      await runPdfProcessing(file);
      return;
    }

    // 3. Regular text/csv/markdown files
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds the 25 MB limit. Please select a smaller file.');
      alertDialog({ title: 'File Too Large', message: 'File exceeds the 25 MB limit. Please select a smaller file.' });
      return;
    }

    const formattedSize = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setFileSizeFormatted(formattedSize);

    try {
      const buffer = await file.arrayBuffer();
      const raw = decodeFileBuffer(buffer);
      // Clean non-printable control characters
      const clean = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
      const trimmedClean = clean.trim();

      if (!trimmedClean) {
        setErrorMsg('The selected file is empty.');
        alertDialog({ title: 'Empty File', message: 'The selected file is empty. Please select a valid dataset file.' });
        return;
      }

      // Check header-only using first 4KB slice instead of splitting entire multi-MB file
      const sampleSlice = trimmedClean.slice(0, 4096);
      const nonCommentLines = sampleSlice.split(/\r?\n/).filter(l => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('---'));
      if (nonCommentLines.length <= 1 && (file.name.endsWith('.csv') || file.name.endsWith('.tsv'))) {
        setErrorMsg('Dataset contains only headers and no data rows.');
        alertDialog({ title: 'Header-Only File', message: 'The selected CSV file contains only headers and no data rows.' });
        return;
      }

      fullContentRef.current = trimmedClean;
      if (trimmedClean.length > 6000) {
        setMarkdownContent(trimmedClean.slice(0, 3000) + `\n\n... [Showing preview of ${formattedSize}. Full dataset will be completely indexed] ...`);
      } else {
        setMarkdownContent(trimmedClean);
      }

      let detected = 'Plain Text';
      if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || sampleSlice.includes(',')) {
        detected = 'Structured CSV Telemetry';
      } else if (file.name.endsWith('.md') || sampleSlice.includes('|')) {
        detected = 'Markdown Document';
      }
      setDetectedFileType(detected);

      // Fast regex search on first 10KB slice
      const farmMatch = sampleSlice.match(/farm_id:\s*(F[0-9]{3}|F00[0-9])|\bF[0-9]{3}\b|\bF00[0-9]\b/i);
      if (farmMatch && !farmId) {
        setFarmId((farmMatch[1] || farmMatch[0]).toUpperCase());
      }
    } catch (err) {
      setErrorMsg('Failed to read file: ' + err.message);
    }
  };


  const runImageOcr = async (file) => {
    setIsOcrMode(true);
    setIsProcessing(true);
    setOcrProgressPercent(5);
    setOcrProgressMessage('Initializing OCR engine...');

    try {
      const { createWorker } = await import('tesseract.js');
      if (cancelRef.current) return;

      const worker = await createWorker(ocrLanguage, 1, {
        logger: (m) => {
          if (cancelRef.current) return;
          if (m.status === 'recognizing text') {
            const p = Math.round((m.progress || 0) * 100);
            setOcrProgressPercent(p);
            setOcrProgressMessage(`Recognizing image text (${p}%)...`);
          } else {
            setOcrProgressMessage(m.status || 'Loading OCR...');
          }
        },
      });

      activeWorkerRef.current = worker;
      if (cancelRef.current) {
        await worker.terminate();
        return;
      }

      setOcrProgressMessage('Processing image text in browser...');
      const ret = await worker.recognize(file);
      await worker.terminate();
      activeWorkerRef.current = null;

      if (cancelRef.current) return;

      const text = ret?.data?.text || '';
      const conf = Math.round(ret?.data?.confidence || 0);

      setMarkdownContent(text);
      setOcrConfidence(conf);
      setIsOcrReviewStep(true);
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      console.error('Image OCR error:', err);
      setErrorMsg(`OCR failed: ${err.message || 'Worker load failure or network error for language data.'}`);
    }
  };

  const runPdfProcessing = async (file) => {
    setIsOcrMode(true);
    setIsProcessing(true);
    setOcrProgressPercent(5);
    setOcrProgressMessage('Loading PDF parser in browser...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (cancelRef.current) return;

      const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
      }

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      if (pdf.numPages > 20) {
        throw new Error('PDF exceeds the 20-page limit (maximum 20 pages supported).');
      }

      const totalPages = pdf.numPages;
      const extractedPages = [];
      const ocrScores = [];
      let tessWorker = null;

      for (let i = 1; i <= totalPages; i++) {
        if (cancelRef.current) break;

        const percent = Math.round(((i - 1) / totalPages) * 100);
        setOcrProgressPercent(percent);
        setOcrProgressMessage(`Processing page ${i} of ${totalPages} (${percent}%)...`);

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let pageText = textContent.items.map((item) => item.str).join(' ').trim();

        // If page has an existing text layer (> 20 characters)
        if (pageText.length >= 20) {
          extractedPages.push(`## Page ${i}\n${pageText}`);
        } else {
          // No text layer found -> Render to canvas and OCR with tesseract.js
          setOcrProgressMessage(`Page ${i} of ${totalPages}: Scanned page detected, running OCR...`);

          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;

          if (!tessWorker) {
            const { createWorker } = await import('tesseract.js');
            tessWorker = await createWorker(ocrLanguage, 1, {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  const p = Math.round((m.progress || 0) * 100);
                  setOcrProgressMessage(`Page ${i} of ${totalPages}: OCR (${p}%)...`);
                }
              },
            });
            activeWorkerRef.current = tessWorker;
          }

          if (cancelRef.current) break;

          const ocrRes = await tessWorker.recognize(canvas);
          pageText = ocrRes?.data?.text || '';
          const conf = ocrRes?.data?.confidence;
          if (conf != null && !isNaN(conf)) {
            ocrScores.push(conf);
          }
          extractedPages.push(`## Page ${i} (OCR)\n${pageText}`);
        }
      }

      if (tessWorker) {
        await tessWorker.terminate();
        activeWorkerRef.current = null;
      }

      if (cancelRef.current) return;

      const fullExtracted = extractedPages.join('\n\n');
      setMarkdownContent(fullExtracted);

      if (ocrScores.length > 0) {
        const avg = Math.round(ocrScores.reduce((a, b) => a + b, 0) / ocrScores.length);
        setOcrConfidence(avg);
      } else {
        setOcrConfidence('n/a'); // Text-layer PDF
      }

      setOcrProgressPercent(100);
      setIsOcrReviewStep(true);
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      console.error('PDF processing error:', err);
      setErrorMsg(`PDF processing error: ${err.message || 'Corrupt PDF or worker failure.'}`);
    }
  };

  const handleFileUpload = (event) => {
    if (Platform.OS === 'web' && event.target && event.target.files?.[0]) {
      processSelectedFile(event.target.files[0]);
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

  const handleSave = async () => {
    if (isProcessing) return; // Prevent double submission
    setErrorMsg('');
    setSuccessMsg('');

    if (!datasetName.trim()) {
      setErrorMsg('Dataset Title is required.');
      return;
    }
    if (!markdownContent.trim()) {
      setErrorMsg('Content is required. Please extract text or enter dataset content.');
      return;
    }

    const trimmedName = datasetName.trim();
    let replaceExisting = false;

    if (datasetService.hasDatasetWithName(trimmedName)) {
      const choice = await choiceDialog({
        title: 'Duplicate Dataset Name',
        message: `A dataset named "${trimmedName}" already exists. How would you like to proceed?`,
        choices: [
          { label: 'Replace Existing', value: 'replace', isDestructive: true },
          { label: 'Keep Both (Add as duplicate)', value: 'keep', isPrimary: true },
        ],
      });
      if (!choice) return;
      if (choice === 'replace') replaceExisting = true;
    }

    const cancelToken = { isCancelled: false };
    cancelTokenRef.current = cancelToken;

    setIsProcessing(true);
    setIndexProgress({ percent: 5, processedRows: 0, totalRows: 0, processedChunks: 0, totalChunks: 0 });

    let lastProgressTimestamp = Date.now();
    const startTime = Date.now();

    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      const now = Date.now();
      // Watchdog: 10 seconds without any progress message or 60s total
      if (now - lastProgressTimestamp > 10000 || now - startTime > 60000) {
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }
        cancelToken.isCancelled = true;
        setIsProcessing(false);
        setIndexProgress(null);
        alertDialog({
          title: 'Indexing Stopped',
          message: 'Indexing took too long and was stopped. Try a smaller file or remove unusual formatting.',
        });
      }
    }, 1000);

    try {
      const actualContent = activeTab === 'paste' ? markdownContent : (fullContentRef.current || markdownContent);
      let rawMd = actualContent;
      if (!rawMd.startsWith('---') && !fileNameUploaded.endsWith('.csv')) {
        rawMd = `---
name: ${trimmedName}
category: ${category.trim() || 'Farm Data'}
farm_id: ${farmId.trim() || ''}
description: ${description.trim() || 'Custom dataset.'}
---

${actualContent.trim()}`;
      }

      const cleanFileName =
        fileNameUploaded || `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;

      const sourceLabel = isOcrMode ? 'OCR' : null;

      const newDs = await datasetService.addCustomDatasetAsync({
        rawText: rawMd,
        fileName: cleanFileName,
        isPasted: activeTab === 'paste',
        sourceLabel,
        replaceExisting,
        cancelToken,
        onProgress: (p) => {
          lastProgressTimestamp = Date.now();
          const now = Date.now();
          if (now - lastUiUpdateRef.current >= 100 || p.percent === 100) {
            lastUiUpdateRef.current = now;
            setIndexProgress(p);
          }
        },
      });

      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }

      setIsProcessing(false);
      setIndexProgress(null);
      setSuccessMsg(`✅ ${newDs.name} indexed successfully (${newDs.chunkCount} chunks)!`);
      showToast(`Dataset ${newDs.name} added (${newDs.rawRowCount || newDs.chunkCount} rows/chunks)!`, 'success');

      setTimeout(() => {
        if (onDatasetAdded) onDatasetAdded(newDs);
        handleClose();
      }, 500);
    } catch (err) {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      setIsProcessing(false);
      setIndexProgress(null);
      if (cancelToken.isCancelled) {
        return;
      }
      setErrorMsg(`Failed to index dataset: ${err.message}`);
      alertDialog({ title: 'Indexing Error', message: err.message });
    }
  };


  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Add & Index Dataset</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Privacy Note */}
          <View style={[styles.privacyBanner, { backgroundColor: theme.primary + '10' }]}>
            <Feather name="shield" size={13} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.privacyText, { color: theme.primary }]}>
              Processed in your browser • 100% private (no files or images uploaded to external servers)
            </Text>
          </View>

          {/* Navigation Tabs (Hidden during OCR review step) */}
          {!isOcrReviewStep && (
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'upload' && { borderBottomColor: theme.primary }]}
                onPress={() => setActiveTab('upload')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'upload' ? theme.primary : theme.textSecondary },
                  ]}
                >
                  📁 Upload (File, Image, PDF)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'paste' && { borderBottomColor: theme.primary }]}
                onPress={() => setActiveTab('paste')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'paste' ? theme.primary : theme.textSecondary },
                  ]}
                >
                  ✏️ Paste Text
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'template' && { borderBottomColor: theme.primary }]}
                onPress={() => setActiveTab('template')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'template' ? theme.primary : theme.textSecondary },
                  ]}
                >
                  📋 Templates
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={[styles.alertBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={{ color: '#DC2626', fontSize: 12.5, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={[styles.alertBox, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#047857" style={{ marginRight: 6 }} />
                <Text style={{ color: '#047857', fontSize: 12.5, fontWeight: 'bold', flex: 1 }}>
                  {successMsg}
                </Text>
              </View>
            ) : null}

            {/* OCR Processing Progress Bar & Cancel */}
            {isProcessing && isOcrMode && (
              <View
                style={[
                  styles.progressCard,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, { color: theme.text }]}>Processing OCR in browser</Text>
                  <Text style={[styles.progressPercentText, { color: theme.primary }]}>
                    {ocrProgressPercent}%
                  </Text>
                </View>

                {/* Progress bar line */}
                <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.max(5, ocrProgressPercent)}%`, backgroundColor: theme.primary },
                    ]}
                  />
                </View>

                <Text style={[styles.progressStatusText, { color: theme.textSecondary }]}>
                  {ocrProgressMessage || 'Working...'}
                </Text>

                <TouchableOpacity
                  style={[styles.cancelOcrBtn, { borderColor: '#EF4444' }]}
                  onPress={handleCancelOcr}
                >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Cancel OCR</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* File Info & Real Progress Bar during Indexing */}
            {isProcessing && !isOcrMode && (
              <View
                style={[
                  styles.progressCard,
                  { backgroundColor: theme.background, borderColor: theme.border, marginVertical: 10 },
                ]}
              >
                {/* File Details Overview */}
                <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 4 }} numberOfLines={1}>
                    📄 {fileNameUploaded || datasetName || 'Custom Dataset'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    {fileSizeFormatted ? (
                      <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginRight: 12 }}>
                        Size: <Text style={{ color: theme.text, fontWeight: '600' }}>{fileSizeFormatted}</Text>
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginRight: 12 }}>
                      Format: <Text style={{ color: theme.primary, fontWeight: '600' }}>{detectedFileType}</Text>
                    </Text>
                    <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                      Status: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Indexing...</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, { color: theme.text }]}>
                    {indexProgress && indexProgress.processedRows > 0
                      ? `Processing Rows (${indexProgress.processedRows.toLocaleString()} / ${indexProgress.totalRows.toLocaleString()})`
                      : indexProgress && indexProgress.processedChunks > 0
                      ? `Chunking Dataset (${indexProgress.processedChunks} chunks)`
                      : indexProgress && indexProgress.percent > 0
                      ? `Indexing Telemetry (${indexProgress.percent}%)`
                      : 'Preparing Dataset...'}
                  </Text>
                  <Text style={[styles.progressPercentText, { color: theme.primary }]}>
                    {indexProgress && indexProgress.percent != null ? indexProgress.percent : 5}%
                  </Text>
                </View>

                <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.max(5, indexProgress && indexProgress.percent != null ? indexProgress.percent : 5)}%`, backgroundColor: theme.primary },
                    ]}
                  />
                </View>

                <Text style={[styles.progressStatusText, { color: theme.textSecondary, marginTop: 6 }]}>
                  Parsing structured columns, caching into IndexedDB & updating knowledge grounding...
                </Text>

                <TouchableOpacity
                  style={[styles.cancelOcrBtn, { borderColor: '#EF4444', marginTop: 10 }]}
                  onPress={handleClose}
                >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Cancel Indexing</Text>
                </TouchableOpacity>
              </View>
            )}


            {/* OCR Review Step Banner */}
            {isOcrReviewStep && (
              <View
                style={[
                  styles.reviewBanner,
                  {
                    backgroundColor: theme.background,
                    borderColor:
                      ocrConfidence !== 'n/a' && ocrConfidence < 60 ? '#EF4444' : theme.primary + '50',
                  },
                ]}
              >
                <View style={styles.reviewBannerRow}>
                  <Text style={[styles.reviewBannerTitle, { color: theme.text }]}>
                    Review Extracted Text ({fileNameUploaded})
                  </Text>
                  <View style={[styles.confidenceBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.confidenceText, { color: theme.primary }]}>
                      Confidence: {ocrConfidence != null ? (ocrConfidence === 'n/a' ? 'n/a (text layer)' : `${ocrConfidence}%`) : 'n/a'}
                    </Text>
                  </View>
                </View>

                {ocrConfidence !== 'n/a' && ocrConfidence < 60 && (
                  <Text style={styles.warningText}>
                    ⚠️ Low OCR confidence ({ocrConfidence}%). Please verify or correct the text below before saving.
                  </Text>
                )}

                {!markdownContent.trim() && (
                  <Text style={styles.warningText}>
                    ⚠️ No text was extracted. Please ensure the document is clear and readable.
                  </Text>
                )}
              </View>
            )}

            {/* TAB 1: FILE UPLOAD */}
            {!isOcrReviewStep && activeTab === 'upload' && !isProcessing && (
              <View
                style={[
                  styles.uploadBox,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={28} color={theme.primary} style={{ marginBottom: 4 }} />
                <Text style={[styles.uploadBoxTitle, { color: theme.text }]}>
                  Select File (.csv, .md, .txt, images, PDF)
                </Text>
                <Text style={[styles.uploadBoxDesc, { color: theme.textSecondary }]}>
                  Supports telemetry CSV, guides, field photos (PNG, JPG, WEBP &le; 10MB), and PDFs (&le; 20 pages).
                </Text>

                {/* Language selector for OCR */}
                <View style={styles.langRow}>
                  <Text style={[styles.langLabel, { color: theme.textSecondary }]}>
                    OCR Language:
                  </Text>
                  <View style={styles.langChips}>
                    {OCR_LANGUAGES.map((lang) => {
                      const isSel = ocrLanguage === lang.code;
                      return (
                        <TouchableOpacity
                          key={lang.code}
                          style={[
                            styles.langChip,
                            {
                              backgroundColor: isSel ? theme.primary : theme.surface,
                              borderColor: isSel ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setOcrLanguage(lang.code)}
                        >
                          <Text
                            style={{
                              color: isSel ? '#FFF' : theme.text,
                              fontSize: 11,
                              fontWeight: isSel ? 'bold' : '500',
                            }}
                          >
                            {lang.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    accept=".csv,.md,.txt,.pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`,
                      background: theme.surface,
                      color: theme.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  />
                )}

                {fileNameUploaded ? (
                  <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: theme.primary + '15', borderWidth: 1, borderColor: theme.primary + '30', width: '100%' }}>
                    <Text style={{ fontSize: 12.5, color: theme.text, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>
                      📄 {fileNameUploaded}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      {fileSizeFormatted ? (
                        <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginRight: 12 }}>
                          Size: <Text style={{ color: theme.text, fontWeight: '600' }}>{fileSizeFormatted}</Text>
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                        Detected: <Text style={{ color: theme.primary, fontWeight: '600' }}>{detectedFileType}</Text>
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* TAB 3: TEMPLATES */}
            {!isOcrReviewStep && activeTab === 'template' && !isProcessing && (
              <View
                style={[
                  styles.templateBox,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>
                  Select Recommended Template:
                </Text>
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
                            borderColor: isSel ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedTemplateKey(key)}
                      >
                        <Text
                          style={{
                            color: isSel ? '#FFF' : theme.text,
                            fontSize: 12,
                            fontWeight: isSel ? 'bold' : '500',
                          }}
                        >
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
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                    Load Selected Template
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* EDITABLE FORM FIELDS (Dataset Title, Farm ID, Content) */}
            {(!isProcessing || isOcrReviewStep) && (
              <>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Dataset Title *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="e.g. F007 Farm Telemetry or Grape Pathology Report"
                  placeholderTextColor={theme.textSecondary}
                  value={datasetName}
                  onChangeText={setDatasetName}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                      ]}
                      placeholder="e.g. Telemetry / OCR Data"
                      placeholderTextColor={theme.textSecondary}
                      value={category}
                      onChangeText={setCategory}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Farm ID (Optional)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                      ]}
                      placeholder="e.g. F007"
                      placeholderTextColor={theme.textSecondary}
                      value={farmId}
                      onChangeText={setFarmId}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {isOcrReviewStep ? 'Extracted Text (Editable) *' : 'Dataset Content *'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="# Dataset Content&#10;Paste observations, readings, soil metrics, or OCR text..."
                  placeholderTextColor={theme.textSecondary}
                  value={markdownContent}
                  onChangeText={setMarkdownContent}
                  multiline
                  numberOfLines={8}
                />
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={handleClose}
            >
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? { height: '100vh', width: '100vw' } : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    height: Platform.OS === 'web' ? '88vh' : '90%',
    maxHeight: 740,
    borderRadius: 14,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    flex: 1,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  uploadBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadBoxDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  langChips: {
    flexDirection: 'row',
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  tmplChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  loadTmplBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  progressCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStatusText: {
    fontSize: 11.5,
    marginBottom: 10,
  },
  cancelOcrBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  reviewBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 6,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
