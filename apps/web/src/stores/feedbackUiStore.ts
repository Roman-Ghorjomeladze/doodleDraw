import { create } from 'zustand';

interface FeedbackUiState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useFeedbackUiStore = create<FeedbackUiState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
