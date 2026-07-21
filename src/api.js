const BASE = import.meta.env.VITE_API_BASE ?? ''

/**
 * The backend returns one error envelope for every failure, so the UI has a
 * single place to turn a failed response into a message worth reading.
 */
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError(
      'Could not reach the service. Check that the backend is running.',
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
    )
  }
  return body
}

export class ApiError extends Error {
  constructor(message, code, details) {
    super(message)
    this.code = code
    this.details = details
  }

  /** Field-level messages, when the failure was a rejected payload. */
  get fieldErrors() {
    return this.details?.fields ?? []
  }
}

export const getHealth = () => request('/health')
export const listLessons = () => request('/lessons')

export const generateQuiz = (payload) =>
  request('/generate-quiz', { method: 'POST', body: JSON.stringify(payload) })

export const ingestLesson = (lessonId, content) =>
  request('/ingest', { method: 'POST', body: JSON.stringify({ lessonId, content }) })
