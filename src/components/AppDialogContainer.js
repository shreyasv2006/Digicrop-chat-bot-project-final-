import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { registerDialogListener, registerToastListener } from '../services/dialogService';

export default function AppDialogContainer({ theme }) {
  const [activeDialog, setActiveDialog] = useState(null);
  const [promptInput, setPromptInput] = useState('');
  const [toasts, setToasts] = useState([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const inputRef = useRef(null);

  // Register dialog listener
  useEffect(() => {
    const unregister = registerDialogListener((dialogConfig) => {
      setActiveDialog(dialogConfig);
      if (dialogConfig.type === 'prompt') {
        setPromptInput(dialogConfig.defaultValue || '');
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        if (dialogConfig.type === 'prompt' && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      });
    });
    return unregister;
  }, [fadeAnim, scaleAnim]);

  // Register toast listener
  useEffect(() => {
    const unregister = registerToastListener((toastItem) => {
      setToasts((prev) => [...prev, toastItem]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastItem.id));
      }, 3000);
    });
    return unregister;
  }, []);

  // Keyboard navigation (Esc cancels, Enter confirms)
  useEffect(() => {
    if (!activeDialog || Platform.OS !== 'web') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        if (activeDialog.type === 'prompt') {
          e.preventDefault();
          handleConfirm();
        } else if (activeDialog.type === 'confirm' && !activeDialog.isDestructive) {
          e.preventDefault();
          handleConfirm();
        } else if (activeDialog.type === 'alert') {
          e.preventDefault();
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog, promptInput]);

  const closeDialog = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setActiveDialog(null);
      if (callback) callback();
    });
  };

  const handleConfirm = () => {
    if (!activeDialog) return;
    const dialog = activeDialog;
    closeDialog(() => {
      if (dialog.type === 'prompt') {
        dialog.onConfirm(promptInput);
      } else {
        dialog.onConfirm();
      }
    });
  };

  const handleCancel = () => {
    if (!activeDialog) return;
    const dialog = activeDialog;
    closeDialog(() => {
      dialog.onCancel();
    });
  };

  const handleChoiceSelect = (val) => {
    if (!activeDialog) return;
    const dialog = activeDialog;
    closeDialog(() => {
      dialog.onSelect(val);
    });
  };

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* IN-APP TOASTS: TOP CENTER STACKED NOTIFICATIONS */}
      {/* ---------------------------------------------------- */}
      {toasts.length > 0 && (
        <View style={styles.toastContainer} pointerEvents="none">
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            return (
              <View
                key={t.id}
                style={[
                  styles.toastItem,
                  {
                    backgroundColor: theme.surfaceDark || '#0C1118',
                    borderColor: isSuccess ? '#10B981' : isError ? '#EF4444' : theme.primary,
                  },
                ]}
              >
                {isSuccess && (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                )}
                {isError && (
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                )}
                {!isSuccess && !isError && (
                  <Feather name="info" size={15} color={theme.primary} style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.toastText, { color: theme.text }]}>{t.message}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ---------------------------------------------------- */}
      {/* IN-APP CENTERED DIALOG MODAL */}
      {/* ---------------------------------------------------- */}
      {activeDialog && (
        <View style={styles.dialogOverlay}>
          {/* Dimmed backdrop - clicking cancels unless destructive */}
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={() => {
              if (!activeDialog.isDestructive) {
                handleCancel();
              }
            }}
          />

          <Animated.View
            style={[
              styles.dialogCard,
              {
                backgroundColor: theme.surfaceDark || theme.cardBg || '#0C1118',
                borderColor: theme.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Title */}
            <View style={styles.titleRow}>
              {activeDialog.isDestructive && (
                <Feather name="alert-triangle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.dialogTitle, { color: theme.text }]}>
                {activeDialog.title}
              </Text>
            </View>

            {/* Message Body */}
            {Boolean(activeDialog.message) && (
              <Text style={[styles.dialogMessage, { color: theme.textSecondary }]}>
                {activeDialog.message}
              </Text>
            )}

            {/* Prompt Input */}
            {activeDialog.type === 'prompt' && (
              <TextInput
                ref={inputRef}
                style={[
                  styles.promptInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                value={promptInput}
                onChangeText={setPromptInput}
                placeholder={activeDialog.placeholder || ''}
                placeholderTextColor={theme.textSecondary}
                autoFocus
                onSubmitEditing={handleConfirm}
              />
            )}

            {/* Choice dialog variant: Vertical button list */}
            {activeDialog.type === 'choice' && (
              <View style={styles.choicesWrapper}>
                {(activeDialog.choices || []).map((ch, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.choiceBtn,
                      ch.isDestructive
                        ? { backgroundColor: '#EF444420', borderColor: '#EF4444' }
                        : ch.isPrimary
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: theme.cardBg, borderColor: theme.border },
                    ]}
                    onPress={() => handleChoiceSelect(ch.value)}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        ch.isDestructive
                          ? { color: '#EF4444' }
                          : ch.isPrimary
                          ? { color: '#FFFFFF' }
                          : { color: theme.text },
                      ]}
                    >
                      {ch.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.choiceBtn, { backgroundColor: 'transparent', borderColor: theme.border }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.choiceText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Standard action buttons row (Alert / Confirm / Prompt) */}
            {activeDialog.type !== 'choice' && (
              <View style={styles.actionsRow}>
                {activeDialog.type !== 'alert' && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.cancelBtn,
                      { borderColor: theme.border, backgroundColor: theme.cardBg },
                    ]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>
                      {activeDialog.cancelText || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.confirmBtn,
                    {
                      backgroundColor: activeDialog.isDestructive ? '#EF4444' : theme.primary,
                      borderColor: activeDialog.isDestructive ? '#EF4444' : theme.primary,
                    },
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {activeDialog.confirmText || (activeDialog.type === 'alert' ? 'OK' : 'Confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    gap: 8,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 480,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dialogOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 10001,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dialogMessage: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 16,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
  },
  confirmBtn: {},
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  choicesWrapper: {
    gap: 8,
    marginTop: 8,
  },
  choiceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
