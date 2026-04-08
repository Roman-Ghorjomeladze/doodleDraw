import { BRUSH_SIZES } from '@doodledraw/shared';

const setTool = vi.fn();
const setBrushSize = vi.fn();
let mockDrawState: any = { tool: 'pen', brushSize: BRUSH_SIZES[0], setTool, setBrushSize };

vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: Object.assign(
    (selector?: any) => selector ? selector(mockDrawState) : mockDrawState,
    { getState: () => mockDrawState, setState: vi.fn() }
  ),
}));

const mockEmit = vi.fn();
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: { current: { emit: mockEmit } },
    emit: mockEmit,
    on: vi.fn(() => vi.fn()),
    connected: true,
    socketVersion: 0,
  }),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import ToolBar from '../ToolBar';

describe('ToolBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawState = { tool: 'pen', brushSize: BRUSH_SIZES[0], setTool, setBrushSize };
  });

  it('renders pen, eraser, and fill tool buttons', () => {
    render(<ToolBar />);
    expect(screen.getByText('✏️')).toBeInTheDocument();
    expect(screen.getByText('🧹')).toBeInTheDocument();
    expect(screen.getByText('🪣')).toBeInTheDocument();
  });

  it('renders brush size buttons', () => {
    render(<ToolBar />);
    // Brush size circles - they have role of button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(BRUSH_SIZES.length);
  });

  it('clicking pen calls setTool with pen', () => {
    render(<ToolBar />);
    fireEvent.click(screen.getByText('✏️'));
    expect(setTool).toHaveBeenCalledWith('pen');
  });

  it('clicking eraser calls setTool with eraser', () => {
    render(<ToolBar />);
    fireEvent.click(screen.getByText('🧹'));
    expect(setTool).toHaveBeenCalledWith('eraser');
  });

  it('clicking fill calls setTool with fill', () => {
    render(<ToolBar />);
    fireEvent.click(screen.getByText('🪣'));
    expect(setTool).toHaveBeenCalledWith('fill');
  });

  it('clear button emits draw:clear', () => {
    render(<ToolBar />);
    fireEvent.click(screen.getByText('🗑️'));
    expect(mockEmit).toHaveBeenCalledWith('draw:clear');
  });

  it('undo button emits draw:undo', () => {
    render(<ToolBar />);
    fireEvent.click(screen.getByText('↩️'));
    expect(mockEmit).toHaveBeenCalledWith('draw:undo');
  });

  it('selected tool gets highlighted styling', () => {
    mockDrawState.tool = 'eraser';
    render(<ToolBar />);
    const eraser = screen.getByText('🧹').closest('button');
    expect(eraser?.className).toContain('bg-primary-500');
  });
});
