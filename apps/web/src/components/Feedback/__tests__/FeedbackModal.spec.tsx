const { submitFeedback } = vi.hoisted(() => ({ submitFeedback: vi.fn() }));
vi.mock('@/utils/feedbackApi', () => ({
  feedbackApi: { submitFeedback },
}));

import { render, screen, act } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import { useFeedbackUiStore } from '@/stores/feedbackUiStore';
import FeedbackModal from '../FeedbackModal';

// The mocked i18n returns the key itself (see src/test/setup.ts), so
// assertions compare against translation keys, not English text.

describe('FeedbackModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedbackUiStore.getState().close();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<FeedbackModal />);
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('opens when the store is opened', () => {
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);
    expect(screen.getByRole('heading', { name: 'feedback.title' })).toBeInTheDocument();
  });

  it('disables submit button when message is empty', () => {
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);
    const btn = screen.getByRole('button', { name: 'feedback.submit' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('switches category on click', () => {
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);
    // Initially "feedback.category.bug" is selected; click "feedback.category.feedback".
    fireEvent.click(screen.getByRole('button', { name: 'feedback.category.feedback' }));
    const feedbackCatBtn = screen.getByRole('button', { name: 'feedback.category.feedback' });
    expect(feedbackCatBtn.className).toContain('bg-primary-500');
    const bugBtn = screen.getByRole('button', { name: 'feedback.category.bug' });
    expect(bugBtn.className).not.toContain('bg-primary-500');
  });

  it('submits feedback and shows success message', async () => {
    submitFeedback.mockResolvedValue({ id: 'f1' });
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);

    const textarea = screen.getByPlaceholderText('feedback.placeholder') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Something broke' } });

    const btn = screen.getByRole('button', { name: 'feedback.submit' });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Trace is attached on submit; assert message + category with loose match.
    expect(submitFeedback).toHaveBeenCalledTimes(1);
    const callArg = submitFeedback.mock.calls[0][0];
    expect(callArg.message).toBe('Something broke');
    expect(callArg.category).toBe('bug');
    expect(callArg.trace).toBeTruthy();

    expect(screen.getByText('feedback.successTitle')).toBeInTheDocument();
  });

  it('shows error message when submission fails', async () => {
    submitFeedback.mockRejectedValue(new Error('Network down'));
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);

    const textarea = screen.getByPlaceholderText('feedback.placeholder');
    fireEvent.change(textarea, { target: { value: 'a bug' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'feedback.submit' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it('close button closes the modal', () => {
    act(() => useFeedbackUiStore.getState().open());
    render(<FeedbackModal />);
    const closeBtn = screen.getByLabelText('feedback.close');
    fireEvent.click(closeBtn);
    expect(useFeedbackUiStore.getState().isOpen).toBe(false);
  });
});
