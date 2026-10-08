/**
 * DigiCrop AI - In-App Promise-Based Dialog & Toast Service
 * Replaces all native window.alert, window.confirm, and window.prompt.
 */

let dialogListener = null;
let toastListener = null;

export function registerDialogListener(fn) {
  dialogListener = fn;
  return () => {
    if (dialogListener === fn) dialogListener = null;
  };
}

export function registerToastListener(fn) {
  toastListener = fn;
  return () => {
    if (toastListener === fn) toastListener = null;
  };
}

/**
 * In-app Alert Dialog (OK)
 * Returns Promise<boolean>
 */
export function alertDialog({ title = 'Notice', message, confirmText = 'OK' }) {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({
        type: 'alert',
        title,
        message,
        confirmText,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(true),
      });
    } else {
      resolve(true);
    }
  });
}

/**
 * In-app Confirm Dialog (Cancel / Confirm)
 * Returns Promise<boolean>
 */
export function confirmDialog({
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}) {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        isDestructive,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * In-app Prompt Dialog (Cancel / Save with text input)
 * Returns Promise<string | null>
 */
export function promptDialog({
  title = 'Enter Value',
  message,
  defaultValue = '',
  placeholder = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
}) {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        confirmText,
        cancelText,
        onConfirm: (val) => resolve(val),
        onCancel: () => resolve(null),
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * In-app Choice Dialog (Multiple options)
 * Choices: [{ label, value, isDestructive, isPrimary }]
 * Returns Promise<string | null>
 */
export function choiceDialog({
  title = 'Choose an Option',
  message,
  choices = [],
}) {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({
        type: 'choice',
        title,
        message,
        choices,
        onSelect: (val) => resolve(val),
        onCancel: () => resolve(null),
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * In-app Top-Center Toast Notification
 * type: 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'info') {
  if (toastListener) {
    toastListener({
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      message,
      type,
    });
  }
}
