/**
 * The signature element: one segment per chunk of the transcript, in lesson
 * order. Lit segments are the passages this quiz drew from.
 *
 * It answers the question a reviewer actually has — "did this quiz cover the
 * whole lesson, or just the opening?" — which a count of chunks cannot.
 */
export default function CoverageStrip({ meta, activeChunk, onSelectChunk }) {
  const total = meta.totalChunksInLesson || meta.chunksUsed
  if (!total) return null

  const used = new Set(meta.chunkIndicesUsed)
  const percent = Math.round((used.size / total) * 100)

  return (
    <section className="coverage panel" aria-labelledby="coverage-heading">
      <div className="coverage__head">
        <div>
          <span className="eyebrow" id="coverage-heading">
            Lesson coverage
          </span>
          <p className="mono" style={{ margin: '0.15rem 0 0', color: 'var(--ink-2)' }}>
            {used.size} of {total} passages used · {percent}% of the transcript
          </p>
        </div>
        <span className="mono" style={{ color: 'var(--ink-3)' }}>
          {meta.retrievalMode === 'full_lesson' ? 'whole lesson' : 'retrieved'}
        </span>
      </div>

      <div className="coverage__track" role="list">
        {Array.from({ length: total }, (_, index) => {
          const isUsed = used.has(index)
          const isActive = activeChunk === index
          return (
            <button
              key={index}
              type="button"
              role="listitem"
              className={[
                'coverage__seg',
                isUsed ? 'coverage__seg--used' : '',
                isActive ? 'coverage__seg--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!isUsed}
              onClick={() => isUsed && onSelectChunk?.(index)}
              aria-label={
                isUsed
                  ? `Passage ${index}, used by this quiz. Jump to its question.`
                  : `Passage ${index}, not used`
              }
            />
          )
        })}
      </div>

      <div className="coverage__scale">
        <span className="mono" style={{ color: 'var(--ink-3)' }}>
          lesson start
        </span>
        <span className="mono" style={{ color: 'var(--ink-3)' }}>
          lesson end
        </span>
      </div>

      <div className="stats">
        <span className="stat">
          <span className="eyebrow">model</span> <b>{meta.model}</b>
        </span>
        <span className="stat">
          <span className="eyebrow">time</span> <b>{(meta.generationMs / 1000).toFixed(1)}s</b>
        </span>
        <span className="stat">
          <span className="eyebrow">llm calls</span> <b>{meta.llmCalls}</b>
        </span>
        {meta.repairAttempts > 0 && (
          <span className="stat">
            <span className="eyebrow">repairs</span> <b>{meta.repairAttempts}</b>
          </span>
        )}
        {meta.topUpAttempts > 0 && (
          <span className="stat">
            <span className="eyebrow">top-ups</span> <b>{meta.topUpAttempts}</b>
          </span>
        )}
        {Object.entries(meta.droppedByRule ?? {}).map(([rule, count]) => (
          <span className="stat" key={rule}>
            <span className="eyebrow">{rule.replace(/_/g, ' ')}</span> <b>{count} dropped</b>
          </span>
        ))}
      </div>

      {meta.shortfall > 0 && (
        <p className="notice">
          Returned {meta.requestedCount - meta.shortfall} of {meta.requestedCount} questions. The
          lesson did not contain enough distinct material for the rest — fewer grounded questions
          beats inventing them.
        </p>
      )}
    </section>
  )
}
