import type {
  AnswerRecord,
  PracticeMode,
  PracticeSession,
  QuestionCategory,
  TrainingStats,
  WrongQuestionRecord,
} from '../types';

export const STATS_KEY = 'speed_training_stats';
export const WRONG_QUESTIONS_KEY = 'speed_training_wrong_questions';
export const SESSIONS_KEY = 'speed_training_sessions';
const BACKUP_KEY = 'speed_training_backup';

const defaultStats: TrainingStats = {
  total: 0,
  correct: 0,
  wrong: 0,
  accuracy: 0,
  sessions: 0,
};

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

interface StorageBackup {
  stats: TrainingStats;
  wrongQuestions: WrongQuestionRecord[];
  sessions: PracticeSession[];
}

const readBackup = (): Partial<StorageBackup> => readJson<Partial<StorageBackup>>(BACKUP_KEY, {});

const writeBackup = (partial: Partial<StorageBackup>) => {
  writeJson(BACKUP_KEY, { ...readBackup(), ...partial });
};

const normalizeWrongQuestion = (record: WrongQuestionRecord): WrongQuestionRecord => ({
  ...record,
  reviewCorrectCount: record.reviewCorrectCount ?? 0,
});

export const isPersistentStorageAvailable = () => {
  try {
    const key = 'speed_training_storage_test';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const calculateAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;

export const getTrainingStats = (): TrainingStats => readJson(STATS_KEY, readBackup().stats ?? defaultStats);

export const saveTrainingStats = (stats: TrainingStats) => {
  writeJson(STATS_KEY, stats);
  writeBackup({ stats });
};

export const updateStatsWithAnswer = (isCorrect: boolean) => {
  const current = getTrainingStats();
  const next: TrainingStats = {
    ...current,
    total: current.total + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    wrong: current.wrong + (isCorrect ? 0 : 1),
    sessions: current.sessions,
  };
  next.accuracy = calculateAccuracy(next.correct, next.total);
  saveTrainingStats(next);
  return next;
};

export const getWrongQuestions = (): WrongQuestionRecord[] =>
  readJson(WRONG_QUESTIONS_KEY, readBackup().wrongQuestions ?? []).map(normalizeWrongQuestion);

export const saveWrongQuestions = (questions: WrongQuestionRecord[]) => {
  const normalizedQuestions = questions.map(normalizeWrongQuestion);
  writeJson(WRONG_QUESTIONS_KEY, normalizedQuestions);
  writeBackup({ wrongQuestions: normalizedQuestions });
};

export const addWrongQuestion = (answer: AnswerRecord) => {
  const records = getWrongQuestions();
  const existing = records.find((item) => item.questionId === answer.questionId);

  if (existing) {
    existing.wrongCount += 1;
    existing.reviewCorrectCount = 0;
    existing.lastUserAnswer = answer.userAnswer;
    existing.lastWrongAt = answer.answeredAt;
    saveWrongQuestions(records);
    return;
  }

  saveWrongQuestions([
    {
      questionId: answer.questionId,
      questionText: answer.questionText,
      correctAnswer: answer.correctAnswer,
      category: answer.category,
      wrongCount: 1,
      reviewCorrectCount: 0,
      lastUserAnswer: answer.userAnswer,
      lastWrongAt: answer.answeredAt,
    },
    ...records,
  ]);
};

export const removeWrongQuestion = (questionId: string) => {
  saveWrongQuestions(getWrongQuestions().filter((item) => item.questionId !== questionId));
};

export const markWrongQuestionCorrect = (questionId: string) => {
  const records = getWrongQuestions();
  const existing = records.find((item) => item.questionId === questionId);

  if (!existing) {
    return;
  }

  existing.reviewCorrectCount = (existing.reviewCorrectCount ?? 0) + 1;

  if (existing.reviewCorrectCount >= 2) {
    removeWrongQuestion(questionId);
    return;
  }

  saveWrongQuestions(records);
};

export const getPracticeSessions = (): PracticeSession[] =>
  readJson(SESSIONS_KEY, readBackup().sessions ?? []);

export const savePracticeSessions = (sessions: PracticeSession[]) => {
  writeJson(SESSIONS_KEY, sessions);
  writeBackup({ sessions });
};

export const createPracticeSession = (
  category: QuestionCategory,
  mode: PracticeMode,
): PracticeSession => {
  const now = new Date().toISOString();
  const session: PracticeSession = {
    id: createId(),
    startedAt: now,
    endedAt: now,
    category,
    mode,
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    answers: [],
  };

  savePracticeSessions([session, ...getPracticeSessions()]);

  const stats = getTrainingStats();
  saveTrainingStats({ ...stats, sessions: stats.sessions + 1 });

  return session;
};

export const appendAnswerToSession = (sessionId: string, answer: AnswerRecord) => {
  const sessions = getPracticeSessions();
  const next = sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    const answers = [...session.answers, answer];
    const correct = answers.filter((item) => item.isCorrect).length;
    const total = answers.length;

    return {
      ...session,
      endedAt: answer.answeredAt,
      answers,
      total,
      correct,
      wrong: total - correct,
      accuracy: calculateAccuracy(correct, total),
    };
  });

  savePracticeSessions(next);
  return next.find((session) => session.id === sessionId);
};

export const finishSession = (sessionId: string) => {
  const now = new Date().toISOString();
  const sessions = getPracticeSessions();
  savePracticeSessions(
    sessions.map((session) => (session.id === sessionId ? { ...session, endedAt: now } : session)),
  );
};

export const getPracticeSessionById = (id: string) =>
  getPracticeSessions().find((session) => session.id === id);
