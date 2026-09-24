interface SourceDetailProps {
  sourcePage: string
  sourceRecord: string
}

function SourceDetail({ sourcePage, sourceRecord }: SourceDetailProps) {
  return (
    <details className="mt-4 rounded border border-gray-300 bg-gray-50 p-3">
      <summary className="cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
        Source details
      </summary>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt className="font-semibold">Page</dt>
        <dd>{sourcePage}</dd>
        <dt className="font-semibold">Record</dt>
        <dd className="break-words">{sourceRecord}</dd>
      </dl>
    </details>
  )
}

export default SourceDetail
