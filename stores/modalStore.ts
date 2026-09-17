import { create } from 'zustand';

export type AlertType = 'warning' | 'error' | 'info' | 'success';

interface AlertModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  buttonText: string;
}

interface ModalStore {
  alertModal: AlertModalState;
  showAlert: (message: string, title?: string, type?: AlertType, buttonText?: string) => void;
  closeAlert: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  alertModal: {
    isOpen: false,
    title: 'Notice',
    message: '',
    type: 'warning',
    buttonText: 'Got It',
  },
  showAlert: (message: string, title = 'Notice', type: AlertType = 'warning', buttonText = 'Got It') =>
    set({
      alertModal: {
        isOpen: true,
        title,
        message,
        type,
        buttonText,
      },
    }),
  closeAlert: () =>
    set((state) => ({
      alertModal: { ...state.alertModal, isOpen: false },
    })),
}));
