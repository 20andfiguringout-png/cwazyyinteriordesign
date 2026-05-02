import {
  handleDesignCommentMentionAck,
  handleDesignCommentsGet,
  handleDesignCommentsGetAll,
  handleDesignCommentsGetMentionsForUser,
  handleDesignCommentsPatch,
} from './handlers';
import { DesignCommentsGetParsedQuery } from './query';

type GlobalCommentsOptions =
  | string
  | {
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

type GetHandlers = {
  getAll: (headers: Headers, options?: GlobalCommentsOptions) => Response;
  getByDesign: (designId: string | null, userEmail?: string) => Response;
  getMentionsForUser: (userEmail?: string) => Response;
};

type PatchHandlers = {
  patchPermissions: (body: unknown, userEmail?: string) => Response;
  patchMentionAck: (body: unknown, headers: Headers) => Response;
};

const defaultGetHandlers: GetHandlers = {
  getAll: handleDesignCommentsGetAll,
  getByDesign: handleDesignCommentsGet,
  getMentionsForUser: handleDesignCommentsGetMentionsForUser,
};

const defaultPatchHandlers: PatchHandlers = {
  patchPermissions: handleDesignCommentsPatch,
  patchMentionAck: handleDesignCommentMentionAck,
};

export function dispatchDesignCommentsGet(
  headers: Headers,
  query: DesignCommentsGetParsedQuery,
  userEmail?: string,
  handlers: GetHandlers = defaultGetHandlers,
) {
  if (query.mode === 'mention-me') {
    return handlers.getMentionsForUser(userEmail);
  }

  if (query.mode === 'all') {
    return handlers.getAll(headers, query.options);
  }

  return handlers.getByDesign(query.designId, userEmail);
}

export function dispatchDesignCommentsPatch(
  headers: Headers,
  body: unknown,
  userEmail?: string,
  handlers: PatchHandlers = defaultPatchHandlers,
) {
  if ((body as { action?: string } | null)?.action === 'mention-ack') {
    return handlers.patchMentionAck(body, headers);
  }

  return handlers.patchPermissions(body, userEmail);
}
