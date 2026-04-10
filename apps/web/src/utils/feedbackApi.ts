import { useAuthStore } from '@/stores/authStore';

const API_BASE = '/api/feedback';

export type FeedbackCategory = 'bug' | 'feedback' | 'other';

export interface SubmitFeedbackInput {
  message: string;
  category?: FeedbackCategory;
  pageUrl?: string;
  trace?: Record<string, any> | null;
}

export class FeedbackApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const feedbackApi = {
  async submitFeedback(input: SubmitFeedbackInput): Promise<{ id: string }> {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: input.message,
        category: input.category,
        pageUrl: input.pageUrl ?? window.location.href,
        trace: input.trace ?? null,
      }),
    });

    if (!res.ok) {
      let message = 'Failed to submit feedback';
      try {
        const body = await res.json();
        message = body.message || message;
      } catch {}
      throw new FeedbackApiError(res.status, message);
    }

    return res.json();
  },
};
