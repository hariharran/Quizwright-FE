import { useCallback, useEffect, useRef, useState } from 'react'

import Controls from './components/Controls'
import CoverageStrip from './components/CoverageStrip'
import QuestionCard from './components/QuestionCard'
import { generateQuiz, getHealth, ingestLesson, listLessons } from './api'

const DEFAULT_FORM = {
  lessonId: 'lesson-001',
  questionCount: 10,
  difficulty: 'medium',
  questionTypes: ['mcq', 'true_false', 'fill_blank', 'short_answer'],
}

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [lessons, setLessons] = useState([])
  const [health, setHealth] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [revealed, setRevealed] = useState(new Set())
  const [activeChunk, setActiveChunk] = useState(null)

  const cardRefs = useRef({})

  const refreshLessons = useCallback(async () => {
    try {
      const { lessons: found } = await listLessons()
      setLessons(found)
      if (found.length && !found.some((l) => l.lessonId === form.lessonId)) {
        setForm((prev) => ({ ...prev, lessonId: found[0].lessonId }))
      }
    } catch {
      // Non-fatal: the lesson id can still be typed by hand.
    }
  }, [form.lessonId])

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ status: 'down' }))
    refreshLessons()
    // Runs once: later refreshes are triggered explicitly after an ingest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerate() {
    setBusy(true)
    setError(null)
    setQuiz(null)
    setRetrying(false)
    setRevealed(new Set())
    try {
      // One automatic retry when the model is busy, so a transient 503 does not
      // become the user's problem. The loading state says it is happening
      // rather than silently doubling the wait.
      setQuiz(await generateQuiz(form, { onRetry: () => setRetrying(true) }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
      setRetrying(false)
    }
  }

  async function handleIngest(content) {
    setBusy(true)
    setError(null)
    try {
      await ingestLesson(form.lessonId, content)
      await refreshLessons()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const allRevealed = quiz ? revealed.size === quiz.questions.length : false

  function toggleAll() {
    setRevealed(allRevealed ? new Set() : new Set(quiz.questions.map((_, i) => i)))
  }

  function revealOne(index) {
    setRevealed((prev) => new Set(prev).add(index))
  }

  function jumpToChunk(chunkIndex) {
    const target = quiz?.questions.findIndex((q) => q.sourceChunkIndex === chunkIndex)
    if (target >= 0) {
      cardRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const healthDot =
    health?.status === 'ok' ? 'dot--ok' : health?.status === 'degraded' ? 'dot--warn' : 'dot--down'

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <span className="eyebrow">Retrieval-augmented quiz generation</span>
          <h1>Turn a lesson transcript into a quiz.</h1>
          <p>
            Questions are written only from passages retrieved out of the ingested transcript.
            Every one shows the passage it came from.
          </p>
        </div>
        <span className="status-pill">
          <span className={`dot ${healthDot}`} />
          {health?.status === 'ok'
            ? `${health.models?.llm ?? 'model'} ready`
            : health?.status === 'degraded'
              ? 'service degraded'
              : 'service unreachable'}
        </span>
      </header>

      <div className="layout">
        <Controls
          form={form}
          setForm={setForm}
          lessons={lessons}
          busy={busy}
          onGenerate={handleGenerate}
          onIngest={handleIngest}
        />

        <main>
          {busy && (
            <div className="loading" aria-live="polite">
              <span className="eyebrow">{retrying ? 'Retrying' : 'Working'}</span>
              <p style={{ margin: '0.4rem 0 1.2rem', color: 'var(--ink-2)' }}>
                {retrying
                  ? 'The model was busy on the first attempt. Trying once more — around 20 seconds.'
                  : `Retrieving passages, then writing ${form.questionCount} questions. This takes around 20 seconds.`}
              </p>
              {Array.from({ length: 5 }, (_, i) => (
                <div className="skeleton-row" key={i} style={{ width: `${92 - i * 11}%` }} />
              ))}
            </div>
          )}

          {!busy && error && (
            <div className="error" role="alert">
              <span className="eyebrow">{error.code}</span>
              <h2>
                {error.isRetryable
                  ? error.attemptedTwice
                    ? 'Still unavailable. Try again later.'
                    : 'That request could not be completed.'
                  : 'That request was not accepted.'}
              </h2>
              <p>
                {error.attemptedTwice
                  ? 'We tried twice and the service is still busy. This is usually temporary — waiting a minute is normally enough.'
                  : error.message}
              </p>

              {error.readableReason && (
                <p className="error__reason">
                  <span className="eyebrow">Reported by the service</span>
                  {error.readableReason}
                </p>
              )}

              {error.fieldErrors.length > 0 && (
                <ul>
                  {error.fieldErrors.map((field) => (
                    <li key={field.field}>
                      {field.field}: {field.message}
                    </li>
                  ))}
                </ul>
              )}

              {error.isRetryable && (
                <button type="button" className="toggle error__retry" onClick={handleGenerate}>
                  Try again
                </button>
              )}
            </div>
          )}

          {!busy && !error && !quiz && (
            <div className="empty">
              <span className="eyebrow">No quiz yet</span>
              <h2>Pick your settings, then generate.</h2>
              <p>
                The transcript is already ingested and embedded. Choose a difficulty and the
                question types you want, and the quiz is written from the lesson itself.
              </p>
            </div>
          )}

          {!busy && quiz && (
            <>
              <CoverageStrip
                meta={quiz.meta}
                activeChunk={activeChunk}
                onSelectChunk={jumpToChunk}
              />

              <div className="results">
                <div className="results__bar">
                  <span className="eyebrow">
                    {quiz.questionCount} questions · {quiz.difficulty}
                  </span>
                  <button type="button" className="toggle" onClick={toggleAll}>
                    {allRevealed ? 'Hide answers' : 'Show all answers'}
                  </button>
                </div>

                {quiz.questions.map((question, index) => (
                  <QuestionCard
                    key={`${question.question}-${index}`}
                    question={question}
                    index={index}
                    revealed={revealed.has(index)}
                    onToggle={() => revealOne(index)}
                    onHover={setActiveChunk}
                    cardRef={(el) => {
                      cardRefs.current[index] = el
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="footer mono">
        Gemini · ChromaDB · FastAPI — questions generated only from the ingested transcript.
      </footer>
    </div>
  )
}
