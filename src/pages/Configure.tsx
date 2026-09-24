import { useId, useState, type FormEvent } from 'react'
import { useQuestions } from '../data/QuestionsContext'
import { buildEligiblePool } from '@lib/filter'
import type { Question, SessionConfig } from '@lib/schema'
import { useSession } from '@store/SessionStore'
import { createSession, defaultSessionConfig } from '@store/createSession'

const controlClass = 'w-full rounded border border-gray-500 bg-white p-2'
const values = (questions: Question[], field: keyof Question) =>
  [...new Set(questions.map((question) => String(question[field])))].sort()

function Filter({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (values: string[]) => void
}) {
  const id = useId()
  return (
    <fieldset className="min-w-0 rounded border border-gray-300 p-3">
      <legend className="px-1 font-semibold">{label}</legend>
      <div className="max-h-48 space-y-1 overflow-y-auto p-1">
        {options.map((option, index) => (
          <div key={option} className="flex items-start gap-2">
            <input id={`${id}-${index}`} type="checkbox" className="mt-2 h-6 w-6 shrink-0"
              checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked
                ? [...selected, option] : selected.filter((value) => value !== option))} />
            <label htmlFor={`${id}-${index}`} className="min-w-0 break-words py-1">{option}</label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

function Configure() {
  const questions = useQuestions()
  const { dispatch } = useSession()
  const [config, setConfig] = useState(defaultSessionConfig)
  const [seed, setSeed] = useState('')
  const [passingScore, setPassingScore] = useState('80')
  const categoryQuestions = questions.filter((question) =>
    !config.categories.length || config.categories.includes(question.category))
  const topicQuestions = categoryQuestions.filter((question) =>
    !config.subcategories.length || config.subcategories.includes(question.subcategory))
  const pool = buildEligiblePool(questions, config)
  const count = config.count !== 'all' && config.count > pool.length ? 'all' : config.count
  const seedValid = seed === '' || (/^\d+$/.test(seed) && Number(seed) >= 1 && Number(seed) <= 2_147_483_647)
  const scoreValid = /^\d+$/.test(passingScore) && Number(passingScore) >= 1 && Number(passingScore) <= 100

  function updateCategories(categories: string[]) {
    const available = questions.filter((question) => !categories.length || categories.includes(question.category))
    const subcategories = config.subcategories.filter((value) => values(available, 'subcategory').includes(value))
    const topicsAvailable = available.filter((question) => !subcategories.length || subcategories.includes(question.subcategory))
    setConfig({ ...config, categories, subcategories,
      topics: config.topics.filter((value) => values(topicsAvailable, 'topic').includes(value)) })
  }

  function start(event: FormEvent) {
    event.preventDefault()
    if (!pool.length || !seedValid || !scoreValid) return
    const session = createSession(questions, { ...config, count, passingScore: Number(passingScore),
      seed: seed === '' ? null : Number(seed) })
    dispatch({ type: 'START_SESSION', session })
    window.location.hash = `#/${config.mode}`
  }

  return (
    <section className="mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold">Configure session</h1>
      <form onSubmit={start} noValidate className="mt-6 space-y-6">
        <div>
          <label htmlFor="mode" className="font-semibold">Mode</label>
          <select id="mode" className={controlClass} value={config.mode}
            onChange={(event) => setConfig({ ...config, mode: event.target.value as SessionConfig['mode'] })}>
            <option value="review">Review</option><option value="test">Test</option>
          </select>
        </div>
        <p className="text-gray-700">Leave a filter unselected to include all its values.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Filter label="Category" options={values(questions, 'category')} selected={config.categories} onChange={updateCategories} />
          <Filter label="Subcategory" options={values(categoryQuestions, 'subcategory')} selected={config.subcategories}
            onChange={(subcategories) => {
              const available = categoryQuestions.filter((question) => !subcategories.length || subcategories.includes(question.subcategory))
              setConfig({ ...config, subcategories, topics: config.topics.filter((value) => values(available, 'topic').includes(value)) })
            }} />
          <Filter label="Topic" options={values(topicQuestions, 'topic')} selected={config.topics}
            onChange={(topics) => setConfig({ ...config, topics })} />
          <Filter label="Difficulty" options={values(questions, 'difficulty')} selected={config.difficulties}
            onChange={(difficulties) => setConfig({ ...config, difficulties })} />
          <Filter label="Question type" options={values(questions, 'questionType')} selected={config.questionTypes}
            onChange={(questionTypes) => setConfig({ ...config, questionTypes })} />
        </div>
        <p role="status" className="rounded bg-blue-100 p-3 font-semibold">{pool.length} eligible questions</p>
        <div>
          <label htmlFor="count" className="font-semibold">Question count</label>
          <select id="count" className={controlClass} value={count} aria-describedby="count-help"
            onChange={(event) => setConfig({ ...config, count: event.target.value === 'all' ? 'all' : Number(event.target.value) })}>
            {[10, 20, 30, 50].map((amount) => <option key={amount} value={amount} disabled={amount > pool.length}>{amount}</option>)}
            <option value="all">All</option>
          </select>
          <p id="count-help" className="text-sm text-gray-700">Maximum available: {pool.length}. All is used when the chosen count exceeds this maximum.</p>
        </div>
        <div>
          <label htmlFor="passing-score" className="font-semibold">Passing score (%)</label>
          <input id="passing-score" type="text" inputMode="numeric" className={controlClass} value={passingScore}
            aria-invalid={!scoreValid} aria-describedby={!scoreValid ? 'score-error' : undefined}
            onChange={(event) => setPassingScore(event.target.value)} />
          {!scoreValid && <p id="score-error" role="alert">Enter a whole-number percentage from 1 to 100.</p>}
        </div>
        <div>
          <label htmlFor="seed" className="font-semibold">Seed (optional)</label>
          <input id="seed" type="text" inputMode="numeric" className={controlClass} value={seed}
            aria-invalid={!seedValid} aria-describedby={seedValid ? 'seed-help' : 'seed-help seed-error'}
            onChange={(event) => setSeed(event.target.value)} />
          <p id="seed-help" className="text-sm text-gray-700">Use the same seed and configuration to repeat a session. Leave blank for random questions.</p>
          {!seedValid && <p id="seed-error" role="alert">Enter a positive integer from 1 to 2,147,483,647, or leave blank.</p>}
        </div>
        {!pool.length && <p>No eligible questions are available. Change your filters to start a session.</p>}
        <button type="submit" disabled={!pool.length || !seedValid || !scoreValid}
          className="rounded bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-500">Start session</button>
      </form>
      <a href="#/" className="mt-6 inline-block font-medium text-blue-800 underline">Return home</a>
    </section>
  )
}

export default Configure
