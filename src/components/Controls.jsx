import { useState } from 'react'

const DIFFICULTIES = ['easy', 'medium', 'hard']

const TYPES = [
  { id: 'mcq', label: 'multiple choice' },
  { id: 'true_false', label: 'true / false' },
  { id: 'fill_blank', label: 'fill the blank' },
  { id: 'short_answer', label: 'short answer' },
]

export default function Controls({ form, setForm, lessons, busy, onGenerate, onIngest }) {
  const [showIngest, setShowIngest] = useState(false)
  const [transcript, setTranscript] = useState('')

  const toggleType = (id) => {
    setForm((prev) => {
      const next = prev.questionTypes.includes(id)
        ? prev.questionTypes.filter((t) => t !== id)
        : [...prev.questionTypes, id]
      // At least one type must stay selected, or there is nothing to generate.
      return next.length ? { ...prev, questionTypes: next } : prev
    })
  }

  return (
    <form
      className="controls panel"
      onSubmit={(event) => {
        event.preventDefault()
        onGenerate()
      }}
    >
      <label className="field">
        <span className="eyebrow">Lesson</span>
        {lessons.length > 0 ? (
          <select
            value={form.lessonId}
            onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
          >
            {lessons.map((lesson) => (
              <option key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.lessonId} · {lesson.chunkCount} passages
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={form.lessonId}
            onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
            placeholder="lesson-001"
          />
        )}
      </label>

      <div className="field">
        <span className="eyebrow">Difficulty</span>
        <div className="segmented">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={form.difficulty === level}
              onClick={() => setForm({ ...form, difficulty: level })}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="eyebrow">Questions</span>
        <input
          type="number"
          min="1"
          max="25"
          value={form.questionCount}
          onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
        />
      </label>

      <div className="field">
        <span className="eyebrow">Question types</span>
        <div className="checks">
          {TYPES.map((type) => (
            <label className="check" key={type.id}>
              <input
                type="checkbox"
                checked={form.questionTypes.includes(type.id)}
                onChange={() => toggleType(type.id)}
              />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      <button className="generate" type="submit" disabled={busy}>
        {busy ? 'Generating…' : 'Generate quiz'}
      </button>

      <button type="button" className="linkish" onClick={() => setShowIngest((v) => !v)}>
        {showIngest ? 'Hide transcript input' : 'Add a lesson transcript'}
      </button>

      {showIngest && (
        <div className="field" style={{ marginTop: '0.9rem' }}>
          <span className="eyebrow">Paste a transcript</span>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Timestamps like [00:12:53] are stripped automatically."
          />
          <button
            type="button"
            className="toggle"
            style={{ marginTop: '0.5rem', width: '100%' }}
            disabled={busy || !transcript.trim()}
            onClick={() => onIngest(transcript).then(() => setTranscript(''))}
          >
            Ingest as {form.lessonId || 'new lesson'}
          </button>
        </div>
      )}
    </form>
  )
}
