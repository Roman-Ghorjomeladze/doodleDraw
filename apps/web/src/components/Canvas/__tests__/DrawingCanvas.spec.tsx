let mockDrawState: any = { tool: 'pen', color: '#000', brushSize: 5 };
vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: Object.assign(
    (selector?: any) => selector ? selector(mockDrawState) : mockDrawState,
    { getState: () => mockDrawState, setState: vi.fn() }
  ),
}));

let mockGameState: any = { drawerId: null, phase: 'drawing', players: [] };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => selector ? selector(mockGameState) : mockGameState,
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: { current: { emit: vi.fn() } },
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    connected: true,
    socketVersion: 0,
  }),
}));

import { render } from '@/test/test-utils';
import DrawingCanvas from '../DrawingCanvas';

describe('DrawingCanvas', () => {
  it('renders without error', () => {
    const { container } = render(<DrawingCanvas isDrawer={false} isBlurred={false} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders for drawer without blur', () => {
    const { container } = render(<DrawingCanvas isDrawer={true} isBlurred={false} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders blurred canvas for opposing team', () => {
    const { container } = render(<DrawingCanvas isDrawer={false} isBlurred={true} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
