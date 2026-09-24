import { useQuestions } from '../data/QuestionsContext'
import { useSession } from '@store/SessionStore'
import { createSession, defaultSessionConfig } from '@store/createSession'

function Home() {
  const questions = useQuestions()
  const { dispatch } = useSession()

  return (
    <section className="mx-auto max-w-2xl py-12 text-center">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">ATA Legacy Study App</h1>
        <p className="mt-4 text-lg text-gray-700">Review ATA Legacy material or test your knowledge.</p>
        <p className="mt-2 text-sm text-gray-600">{questions.length} study questions available.</p>
      </header>
      <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
        <section aria-labelledby="review-mode-heading" className="rounded border border-gray-300 bg-white p-5">
          <h2 id="review-mode-heading" className="text-xl font-semibold">Review Mode</h2>
          <p className="mt-2 text-gray-700">Practice at your own pace with immediate answer feedback and explanations. Reveal flash cards, then mark what you know or need to review.</p>
        </section>
        <section aria-labelledby="test-mode-heading" className="rounded border border-gray-300 bg-white p-5">
          <h2 id="test-mode-heading" className="text-xl font-semibold">Test Mode</h2>
          <p className="mt-2 text-gray-700">Check your knowledge and review your answers before submitting. See your score and explanations afterward. Flash cards are self-assessed and do not count toward your score.</p>
        </section>
      </div>
      <p id="quick-start-help" className="mt-8 text-gray-700">Quick Start begins a randomized Review session with up to 20 questions from all categories and question types.</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={!questions.length}
          aria-describedby="quick-start-help"
          className="rounded bg-blue-700 px-5 py-3 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:bg-gray-500"
          onClick={() => {
            dispatch({ type: 'START_SESSION', session: createSession(questions, defaultSessionConfig()) })
            window.location.hash = '#/review'
          }}>Quick Start</button>
        <nav aria-label="Session setup">
          <a
            href="#/configure"
            className="inline-block rounded border border-blue-700 px-5 py-3 font-semibold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Configure session
          </a>
        </nav>
      </div>
      {!questions.length && <p className="mt-4 text-gray-700">No study questions are available. Quick Start is unavailable.</p>}
    </section>
  )
}

export default Home
