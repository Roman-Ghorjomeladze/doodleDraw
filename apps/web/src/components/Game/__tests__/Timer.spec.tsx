import { render, screen } from '@/test/test-utils';
import Timer from '../Timer';

describe('Timer', () => {
  it('displays the timeLeft value', () => {
    render(<Timer timeLeft={45} />);
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('uses green color when time > 30s', () => {
    const { container } = render(<Timer timeLeft={50} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#22c55e');
  });

  it('uses yellow color when 10 < time <= 30', () => {
    const { container } = render(<Timer timeLeft={20} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#eab308');
  });

  it('uses red color when time <= 10', () => {
    const { container } = render(<Timer timeLeft={5} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#ef4444');
  });

  it('uses default total of 80 when not provided', () => {
    const { container } = render(<Timer timeLeft={40} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('respects custom total', () => {
    const { container } = render(<Timer timeLeft={50} total={100} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });
});
