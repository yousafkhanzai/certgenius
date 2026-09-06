'use client'

import Link from 'next/link'
import React, { useMemo, useState } from 'react'

type Option = {
  text: string
  isCorrect: boolean
}

type Question = {
  id: string
  questionText: string
  explanation?: string
  options: Option[]
}

type Props = {
  certTitle: string
  questions: Question[]
}

export const PracticeTest: React.FC<Props> = ({ certTitle, questions }) => {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    new Array(questions.length).fill(null),
  )
  const [finished, setFinished] = useState(false)

  const question = questions[current]

  const score = useMemo(() => {
    return answers.reduce((total: number, answerIndex, i) => {
      if (answerIndex === null) return total
      const q = questions[i]
      return q?.options[answerIndex]?.isCorrect ? total + 1 : total
    }, 0)
  }, [answers, questions])

  const handleSelect = (index: number) => {
    if (selected !== null) return // already answered this question
    setSelected(index)
    setAnswers((prev) => {
      const next = [...prev]
      next[current] = index
      return next
    })
  }

  const goNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setCurrent((c) => c + 1)
    setSelected(answers[current + 1] ?? null)
  }

  const restart = () => {
    setCurrent(0)
    setSelected(null)
    setAnswers(new Array(questions.length).fill(null))
    setFinished(false)
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100)
    return (
      <div className="border rounded-lg p-8 text-center">
        <h2 className="mb-2">Practice Test Complete</h2>
        <p className="text-muted-foreground mb-6">{certTitle}</p>
        <div className="text-5xl font-bold mb-2">{percent}%</div>
        <p className="mb-8 text-muted-foreground">
          You got {score} out of {questions.length} questions correct.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={restart}
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 font-medium"
          >
            Retake Test
          </button>
          <Link
            href="/certifications"
            className="inline-flex items-center rounded-md border px-5 py-3 font-medium no-underline"
          >
            Browse More Certifications
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
        <span>
          Question {current + 1} of {questions.length}
        </span>
        <span>
          Score so far: {score}/{answers.filter((a) => a !== null).length}
        </span>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">{question.questionText}</h3>

        <div className="flex flex-col gap-3 mb-6">
          {question.options.map((opt, i) => {
            const isSelected = selected === i
            const showCorrectness = selected !== null
            const isCorrectOption = opt.isCorrect

            let stateClasses = 'border'
            if (showCorrectness && isCorrectOption) {
              stateClasses = 'border-green-600 bg-green-50 dark:bg-green-950'
            } else if (showCorrectness && isSelected && !isCorrectOption) {
              stateClasses = 'border-red-600 bg-red-50 dark:bg-red-950'
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`text-left rounded-md px-4 py-3 transition-colors ${stateClasses} ${
                  selected === null ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
                }`}
              >
                {opt.text}
              </button>
            )
          })}
        </div>

        {selected !== null && question.explanation && (
          <div className="text-sm text-muted-foreground border-t pt-4 mb-4">
            <strong>Explanation: </strong>
            {question.explanation}
          </div>
        )}

        {selected !== null && (
          <button
            onClick={goNext}
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 font-medium"
          >
            {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  )
}
