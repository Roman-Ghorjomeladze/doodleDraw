import { create } from 'zustand';
import type { Handicap } from '@doodledraw/shared';

export type DrawingTool = 'pen' | 'eraser' | 'fill';

interface DrawingState {
  tool: DrawingTool;
  color: string;
  brushSize: number;
  isDrawing: boolean;
  canDraw: boolean;
  handicap: Handicap | null;
}

interface DrawingActions {
  setTool: (tool: DrawingTool) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setCanDraw: (canDraw: boolean) => void;
  setHandicap: (handicap: Handicap | null) => void;
  reset: () => void;
}

export type DrawingStore = DrawingState & DrawingActions;

const initialState: DrawingState = {
  tool: 'pen',
  color: '#000000',
  brushSize: 5,
  isDrawing: false,
  canDraw: false,
  handicap: null,
};

export const useDrawingStore = create<DrawingStore>()((set) => ({
  ...initialState,

  setTool: (tool) => set({ tool }),

  setColor: (color) => set({ color }),

  setBrushSize: (brushSize) => set({ brushSize }),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  setCanDraw: (canDraw) => set({ canDraw }),

  setHandicap: (handicap) => set({ handicap }),

  reset: () => set(initialState),
}));
