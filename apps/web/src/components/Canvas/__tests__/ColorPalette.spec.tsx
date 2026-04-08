import { DRAWING_COLORS } from '@doodledraw/shared';

const setColor = vi.fn();
let mockDrawState: any = { color: DRAWING_COLORS[0], handicap: null, setColor };

vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: Object.assign(
    (selector?: any) => selector ? selector(mockDrawState) : mockDrawState,
    { getState: () => mockDrawState, setState: vi.fn() }
  ),
}));

import { render } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import ColorPalette from '../ColorPalette';

describe('ColorPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawState = { color: DRAWING_COLORS[0], handicap: null, setColor };
  });

  it('renders all color swatches', () => {
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    expect(swatches.length).toBe(DRAWING_COLORS.length);
  });

  it('selected color has ring indicator', () => {
    mockDrawState.color = DRAWING_COLORS[2];
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    expect(swatches[2].className).toContain('ring-2');
  });

  it('clicking a color calls setColor', () => {
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    fireEvent.click(swatches[3]);
    expect(setColor).toHaveBeenCalledWith(DRAWING_COLORS[3]);
  });

  it('handicap with limited colors disables non-allowed swatches', () => {
    mockDrawState.handicap = { limitedColors: true, availableColors: [DRAWING_COLORS[0]], minBrushSize: 5 };
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    expect(swatches[1].hasAttribute('disabled')).toBe(true);
    expect(swatches[0].hasAttribute('disabled')).toBe(false);
  });

  it('disabled colors do not call setColor on click', () => {
    mockDrawState.handicap = { limitedColors: true, availableColors: [DRAWING_COLORS[0]], minBrushSize: 5 };
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    fireEvent.click(swatches[1]);
    expect(setColor).not.toHaveBeenCalled();
  });

  it('allowed colors still call setColor when handicap is set', () => {
    mockDrawState.handicap = { limitedColors: true, availableColors: [DRAWING_COLORS[0], DRAWING_COLORS[1]], minBrushSize: 5 };
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('button');
    fireEvent.click(swatches[1]);
    expect(setColor).toHaveBeenCalledWith(DRAWING_COLORS[1]);
  });
});
