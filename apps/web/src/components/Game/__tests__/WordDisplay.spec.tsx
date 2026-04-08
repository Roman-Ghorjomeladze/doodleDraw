import { render, screen } from '@/test/test-utils';
import WordDisplay from '../WordDisplay';

describe('WordDisplay', () => {
  it('shows full word for the drawer', () => {
    render(<WordDisplay hint="_ _ _" word="cat" isDrawer={true} />);
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('game.yourWord')).toBeInTheDocument();
  });

  it('shows hint for non-drawers', () => {
    const { container } = render(<WordDisplay hint="c _ t" word="cat" isDrawer={false} />);
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
    // Should render character spans
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('falls back to hint when drawer has no word', () => {
    const { container } = render(<WordDisplay hint="_ _ _" isDrawer={true} />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('renders space characters', () => {
    const { container } = render(<WordDisplay hint="_ _ _   _ _ _" isDrawer={false} />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(13); // characters in hint string
  });

  it('renders revealed letters in colored style', () => {
    const { container } = render(<WordDisplay hint="c _ t" isDrawer={false} />);
    const coloredSpans = container.querySelectorAll('.text-primary-600');
    expect(coloredSpans.length).toBeGreaterThan(0);
  });
});
