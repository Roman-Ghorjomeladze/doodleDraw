import { describe, it, expect, beforeEach } from 'vitest';
import { useDrawingStore } from '@/stores/drawingStore';
import type { Handicap } from '@doodledraw/shared';

describe('drawingStore', () => {
  beforeEach(() => {
    useDrawingStore.getState().reset();
  });

  it('has expected initial values', () => {
    const state = useDrawingStore.getState();
    expect(state.tool).toBe('pen');
    expect(state.color).toBe('#000000');
    expect(state.brushSize).toBe(5);
    expect(state.isDrawing).toBe(false);
    expect(state.canDraw).toBe(false);
    expect(state.handicap).toBeNull();
  });

  it('setTool updates the tool', () => {
    useDrawingStore.getState().setTool('eraser');
    expect(useDrawingStore.getState().tool).toBe('eraser');
    useDrawingStore.getState().setTool('fill');
    expect(useDrawingStore.getState().tool).toBe('fill');
  });

  it('setColor updates the color', () => {
    useDrawingStore.getState().setColor('#ff0000');
    expect(useDrawingStore.getState().color).toBe('#ff0000');
  });

  it('setBrushSize updates the brush size', () => {
    useDrawingStore.getState().setBrushSize(20);
    expect(useDrawingStore.getState().brushSize).toBe(20);
  });

  it('setIsDrawing toggles drawing flag', () => {
    useDrawingStore.getState().setIsDrawing(true);
    expect(useDrawingStore.getState().isDrawing).toBe(true);
    useDrawingStore.getState().setIsDrawing(false);
    expect(useDrawingStore.getState().isDrawing).toBe(false);
  });

  it('setCanDraw toggles canDraw flag', () => {
    useDrawingStore.getState().setCanDraw(true);
    expect(useDrawingStore.getState().canDraw).toBe(true);
  });

  it('setHandicap stores a handicap object', () => {
    const handicap: Handicap = {
      limitedColors: true,
      minBrushSize: 20,
      availableColors: ['#ff0000', '#00ff00'],
    };
    useDrawingStore.getState().setHandicap(handicap);
    expect(useDrawingStore.getState().handicap).toEqual(handicap);
  });

  it('setHandicap accepts null to clear handicap', () => {
    useDrawingStore.getState().setHandicap({
      limitedColors: false,
      minBrushSize: 5,
      availableColors: [],
    });
    useDrawingStore.getState().setHandicap(null);
    expect(useDrawingStore.getState().handicap).toBeNull();
  });

  it('reset returns the store to its initial values', () => {
    useDrawingStore.getState().setTool('fill');
    useDrawingStore.getState().setColor('#abcdef');
    useDrawingStore.getState().setBrushSize(40);
    useDrawingStore.getState().setIsDrawing(true);
    useDrawingStore.getState().setCanDraw(true);
    useDrawingStore.getState().setHandicap({
      limitedColors: true,
      minBrushSize: 20,
      availableColors: ['#fff'],
    });

    useDrawingStore.getState().reset();

    const state = useDrawingStore.getState();
    expect(state.tool).toBe('pen');
    expect(state.color).toBe('#000000');
    expect(state.brushSize).toBe(5);
    expect(state.isDrawing).toBe(false);
    expect(state.canDraw).toBe(false);
    expect(state.handicap).toBeNull();
  });

  it('individual setters do not interfere with each other', () => {
    useDrawingStore.getState().setTool('eraser');
    useDrawingStore.getState().setColor('#123456');
    const state = useDrawingStore.getState();
    expect(state.tool).toBe('eraser');
    expect(state.color).toBe('#123456');
    expect(state.brushSize).toBe(5);
  });
});
