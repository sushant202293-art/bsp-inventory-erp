import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const defaultOptions: ConfirmOptions = {
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    ...defaultOptions,
    isOpen: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback(
    (options?: Partial<ConfirmOptions>): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...defaultOptions,
          ...options,
          isOpen: true,
          onConfirm: () => {
            setState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setState((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  const confirmDelete = useCallback(
    (itemName: string) =>
      confirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      }),
    [confirm]
  );

  const confirmDiscard = useCallback(
    () =>
      confirm({
        title: 'Discard Changes',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        variant: 'warning',
      }),
    [confirm]
  );

  const confirmAction = useCallback(
    (action: string) =>
      confirm({
        title: 'Confirm Action',
        message: `Are you sure you want to ${action}?`,
        confirmText: 'Yes, Proceed',
        cancelText: 'Cancel',
        variant: 'info',
      }),
    [confirm]
  );

  return {
    confirm,
    confirmDelete,
    confirmDiscard,
    confirmAction,
    isOpen: state.isOpen,
    options: state,
    onConfirm: state.onConfirm,
    onCancel: state.onCancel,
  };
}

export default useConfirm;
