import { useQuestions } from '../data/QuestionsContext'

function Home() {
  const questions = useQuestions()

  return (
    <section className="mx-auto max-w-2xl py-12 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">ATA Legacy Study App</h1>
      <p className="mt-4 text-lg text-gray-700">Review ATA Legacy material or test your knowledge.</p>
      <p className="mt-2 text-sm text-gray-600">{questions.length} study questions available.</p>
      <a
        href="#/configure"
        className="mt-8 inline-block rounded bg-blue-700 px-5 py-3 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
      >
        Configure session
      </a>
    </section>
  )
}

export default Home
