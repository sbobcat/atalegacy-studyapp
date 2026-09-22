interface ProgressBarProps {
  current: number
  total: number
  mode?: 'review' | 'test'
  unansweredCount?: number
}

function ProgressBar({ current, total, mode = 'review', unansweredCount = 0 }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1)
  const safeCurrent = Math.min(Math.max(current, 0), total)

  return (
    <div className="w-full" aria-label="Session progress">
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm font-medium text-gray-700">
        <span>Question {safeCurrent} of {total}</span>
        {mode === 'test' && <span>{unansweredCount} unanswered</span>}
      </div>
      <progress
        value={safeCurrent}
        max={safeTotal}
        className="h-3 w-full overflow-hidden rounded-full accent-blue-700"
      >
        {safeCurrent} of {total}
      </progress>
    </div>
  )
}

export default ProgressBar
