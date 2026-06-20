export type QuestionCategory = 'squares' | 'powers' | 'percents';

export type PracticeMode = 'practice' | 'test' | 'wrongReview';

export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  correctAnswer: string;
  displayAnswer?: string;
  acceptedAnswers?: readonly string[];
}

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  category: QuestionCategory;
  mode: PracticeMode;
}

export interface PracticeSession {
  id: string;
  startedAt: string;
  endedAt: string;
  category: QuestionCategory;
  mode: PracticeMode;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  answers: AnswerRecord[];
}

export interface TrainingStats {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  sessions: number;
}

export interface WrongQuestionRecord {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  category: QuestionCategory;
  wrongCount: number;
  reviewCorrectCount: number;
  lastUserAnswer: string;
  lastWrongAt: string;
}
