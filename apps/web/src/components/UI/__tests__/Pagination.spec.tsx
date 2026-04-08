import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/test-utils';
import Pagination from '@/components/UI/Pagination';

describe('Pagination', () => {
  it('renders current and total page key', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('pagination.page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pagination.prev' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pagination.next' })).toBeInTheDocument();
  });

  it('disables prev button on page 1', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'pagination.prev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pagination.next' })).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'pagination.next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pagination.prev' })).not.toBeDisabled();
  });

  it('calls onPageChange with prev page when prev is clicked', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'pagination.prev' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with next page when next is clicked', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'pagination.next' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('renders nothing when totalPages is 1', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
