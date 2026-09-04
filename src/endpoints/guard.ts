import type { PayloadHandler, PayloadRequest } from 'payload'

export const BUILDER_HEADER = 'X-Block-Builder'
const BUILDER_HEADER_LOWER = BUILDER_HEADER.toLowerCase()
const BUILDER_HEADER_VALUE = '1'

/**
 * Wraps an internal Block Builder endpoint with the two checks every one of
 * them needs:
 *
 *  1. An authenticated Payload session.
 *  2. A required `X-Block-Builder: 1` request header.
 *
 * The header is not a CSRF *token* -- it carries no secret and proves nothing
 * about the requester. It works because it is not a CORS-safelisted header, so
 * any cross-origin request carrying it must first pass a preflight the browser
 * will not grant. That blocks form-style and image-tag CSRF, which cannot set
 * custom headers at all. It is deliberately not a substitute for Payload's own
 * session handling, and the error message says what is actually missing rather
 * than implying a token exists.
 */
export function withBuilderGuard(handler: PayloadHandler): PayloadHandler {
  return async (req: PayloadRequest) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (req.headers.get(BUILDER_HEADER_LOWER) !== BUILDER_HEADER_VALUE) {
      return Response.json(
        {
          error: `Missing or invalid "${BUILDER_HEADER}" header. Internal Block Builder endpoints require "${BUILDER_HEADER}: ${BUILDER_HEADER_VALUE}".`,
        },
        { status: 403 },
      )
    }

    return handler(req)
  }
}
