import MultipleChoiceRenderer from './MultipleChoiceRenderer'
import SelectAllRenderer from './SelectAllRenderer'
import FlashCardRenderer from './FlashCardRenderer'
import MatchingRenderer from './MatchingRenderer'
import UnknownTypeRenderer from './UnknownTypeRenderer'
import type { QuestionRendererProps } from './types'

export type { QuestionRendererProps } from './types'

export default function QuestionRenderer(props: QuestionRendererProps) {
  switch (props.question.questionType) {
    case 'Four-choice multiple choice':
    case 'Reverse recognition':
    case 'Scenario/application':
      return <MultipleChoiceRenderer {...props} />
    case 'Select-all-that-apply':
      return <SelectAllRenderer {...props} />
    case 'Direct-recall flash card':
      return <FlashCardRenderer key={props.question.questionId} {...props} />
    case 'Matching / classification':
      return <MatchingRenderer {...props} />
    default:
      return <UnknownTypeRenderer {...props} />
  }
}
