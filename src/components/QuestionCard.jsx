const TYPE_LABELS = {
  mcq: 'multiple choice',
  true_false: 'true / false',
  fill_blank: 'fill the blank',
  short_answer: 'short answer',
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuestionCard({ question, index, revealed, onToggle, onHover, cardRef }) {
  const { type, difficulty, options, correctAnswer, explanation, sourceChunkIndex } = question

  return (
    <article
      className="card"
      ref={cardRef}
      onMouseEnter={() => onHover?.(sourceChunkIndex)}
      onMouseLeave={() => onHover?.(null)}
    >
      <header className="card__head">
        <span className="card__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="tag tag--type">{TYPE_LABELS[type] ?? type}</span>
        <span className="tag">{difficulty}</span>
        {Number.isInteger(sourceChunkIndex) && (
          <span className="tag tag--source" title="Transcript passage this came from">
            passage {sourceChunkIndex}
          </span>
        )}
      </header>

      <h3 className="card__question">{question.question}</h3>

      {options?.length > 0 && (
        <ul className="options">
          {options.map((option, i) => {
            const isCorrect = revealed && option === correctAnswer
            return (
              <li key={option} className={`option ${isCorrect ? 'option--correct' : ''}`}>
                <span className="option__key">{isCorrect ? '✓' : LETTERS[i]}</span>
                <span>{option}</span>
              </li>
            )
          })}
        </ul>
      )}

      {revealed ? (
        <>
          {!options?.length && (
            <div className="answer">
              <span className="answer__label">Answer</span>
              {correctAnswer}
            </div>
          )}
          <p className="explanation">{explanation}</p>
        </>
      ) : (
        <button type="button" className="hidden-answer" onClick={onToggle} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
          Answer hidden — click to reveal
        </button>
      )}
    </article>
  )
}
