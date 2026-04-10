import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import { useFeedbackUiStore } from '@/stores/feedbackUiStore';
import FeedbackButton from '../FeedbackButton';

describe('FeedbackButton', () => {
  beforeEach(() => {
    useFeedbackUiStore.getState().close();
  });

  it('renders with an accessible label', () => {
    render(<FeedbackButton />);
    expect(screen.getByLabelText('feedback.buttonLabel')).toBeInTheDocument();
  });

  it('opens the feedback modal on click', () => {
    render(<FeedbackButton />);
    expect(useFeedbackUiStore.getState().isOpen).toBe(false);
    fireEvent.click(screen.getByLabelText('feedback.buttonLabel'));
    expect(useFeedbackUiStore.getState().isOpen).toBe(true);
  });
});
