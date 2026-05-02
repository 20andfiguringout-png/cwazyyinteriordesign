export type DesignCommentsGetParsedQuery =
  | { mode: 'mention-me' }
  | {
      mode: 'all';
      options: {
        mention?: string | null;
        designId?: string | null;
        author?: string | null;
        mentionsOnly?: boolean;
        from?: string | null;
        to?: string | null;
        sort?: 'newest' | 'oldest' | 'most-mentioned';
        page?: number;
        pageSize?: number;
      };
    }
  | { mode: 'design'; designId: string | null };

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value ?? String(fallback));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parseSort(value: string | null): 'newest' | 'oldest' | 'most-mentioned' {
  if (value === 'oldest') return 'oldest';
  if (value === 'most-mentioned') return 'most-mentioned';
  return 'newest';
}

export function parseDesignCommentsGetQuery(
  searchParams: URLSearchParams,
): DesignCommentsGetParsedQuery {
  const mentionMe = searchParams.get('mentionMe') === '1';
  if (mentionMe) {
    return { mode: 'mention-me' };
  }

  const all = searchParams.get('all') === '1';
  if (all) {
    return {
      mode: 'all',
      options: {
        mention: searchParams.get('mention'),
        designId: searchParams.get('designId'),
        author: searchParams.get('author'),
        mentionsOnly: searchParams.get('mentionsOnly') === '1',
        from: searchParams.get('from'),
        to: searchParams.get('to'),
        sort: parseSort(searchParams.get('sort')),
        page: toPositiveInt(searchParams.get('page'), 1),
        pageSize: toPositiveInt(searchParams.get('pageSize'), 30),
      },
    };
  }

  return {
    mode: 'design',
    designId: searchParams.get('designId'),
  };
}
