import type { LeaderboardEntry } from '@doodledraw/shared';

const API_BASE = '/api/leaderboard';

export type LeaderboardType = 'allTime' | 'weekly' | 'country' | 'age';

export interface LeaderboardPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface LeaderboardResponse {
  players: LeaderboardEntry[];
  type: LeaderboardType;
  pagination: LeaderboardPagination;
}

interface GetLeaderboardParams {
  type: LeaderboardType;
  country?: string;
  ageGroup?: string;
  /** 1-indexed page number. Mutually exclusive with offset. */
  page?: number;
  /** 0-indexed offset. Overrides page if both are provided. */
  offset?: number;
  /** Page size. Defaults to server's 20, max 100. */
  limit?: number;
  signal?: AbortSignal;
}

async function leaderboardFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export const leaderboardApi = {
  get: ({ type, country, ageGroup, page, offset, limit, signal }: GetLeaderboardParams) => {
    const params = new URLSearchParams({ type });
    if (country) params.set('country', country);
    if (ageGroup) params.set('ageGroup', ageGroup);
    if (limit) params.set('limit', String(limit));
    if (offset !== undefined) {
      params.set('offset', String(offset));
    } else if (page !== undefined) {
      params.set('page', String(page));
    }
    return leaderboardFetch<LeaderboardResponse>(`?${params.toString()}`, { signal });
  },
};
