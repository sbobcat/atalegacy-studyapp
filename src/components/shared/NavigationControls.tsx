interface NavigationControlsProps {
  onPrevious: () => void
  onNext: () => void
  onEndSession: () => void
  canGoPrevious: boolean
  canAdvance: boolean
  isLastQuestion: boolean
}

const buttonClass = 'min-h-11 rounded px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function NavigationControls({
  onPrevious,
  onNext,
  onEndSession,
  canGoPrevious,
  canAdvance,
  isLastQuestion,
}: NavigationControlsProps) {
  return (
    <nav aria-label="Question navigation" className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={`${buttonClass} border border-gray-400 bg-white`}
      >
        Previous
      </button>
      {isLastQuestion ? (
        <button
          type="button"
          onClick={onEndSession}
          disabled={!canAdvance}
          className={`${buttonClass} bg-blue-700 text-white`}
        >
          End session
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className={`${buttonClass} bg-blue-700 text-white`}
        >
          Next
        </button>
      )}
    </nav>
  )
}

export default NavigationControls
