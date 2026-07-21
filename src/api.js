const BASE = import.meta.env.VITE_API_BASE ?? ''

/** Failures worth one more attempt: the upstream is busy, not the request wrong. */
const RETRYABLE_CODES = new Set([
  'LLM_FAILURE',
  'LLM_TIMEOUT',
  'LLM_INVALID_JSON',
  'EMBEDDING_FAILURE',
  'VECTOR_DB_FAILURE',
  'NETWORK_ERROR',
])

const RETRY_DELAY_MS = 2000

export class ApiError extends Error {
  constructor(message, code, details, status = 0) {
    super(message)
    this.code = code
    this.details = details
    this.status = status
    this.attemptedTwice = false
  }

  /** Field-level messages, when the failure was a rejected payload. */
  get fieldErrors() {
    return this.details?.fields ?? []
  }

  get isRetryable() {
    return RETRYABLE_CODES.has(this.code) || this.status >= 502
  }

  /**
   * Provider errors arrive as a raw dump:
   *   503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is
   *   currently experiencing high demand...', 'status': 'UNAVAILABLE'}}
   * Pull out the sentence a person can act on.
   */
  get readableReason() {
    const reason = this.details?.reason
    if (!reason) return null
    const match = reason.match(/'message':\s*'([^']+)'/)
    return match ? match[1] : reason
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError(
      'Could not reach the service. Check your connection and try again.',
      'NETWORK_ERROR',
    )
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = body?.error
    throw new ApiError(
      error?.message || `Request failed with status ${response.status}.`,
      error?.code || 'HTTP_ERROR',
      error?.details,
      response.status,
    )
  }
  return body
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Run `fn`; on a retryable failure try exactly once more.
 *
 * One retry, not a loop: a busy model usually clears within seconds, but
 * hammering a provider that is shedding load makes it worse, and every attempt
 * costs the user another 20+ seconds of waiting.
 */
async function withOneRetry(fn, { onRetry } = {}) {
  try {
    return await fn()
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isRetryable) throw error

    onRetry?.(error)
    await wait(RETRY_DELAY_MS)

    try {
      return await fn()
    } catch (retryError) {
      if (retryError instanceof ApiError) retryError.attemptedTwice = true
      throw retryError
    }
  }
}

export const getHealth = () => request('/health')
export const listLessons = () => request('/lessons')

export const generateQuiz = (payload, options) =>
  withOneRetry(
    () => request('/generate-quiz', { method: 'POST', body: JSON.stringify(payload) }),
    options,
  )

export const ingestLesson = (lessonId, content) =>
  request('/ingest', { method: 'POST', body: JSON.stringify({ lessonId, content }) })
