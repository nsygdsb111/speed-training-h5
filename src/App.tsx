import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { NumericKeypad } from './components/NumericKeypad';
import { categoryLabels, getQuestionById, modeLabels, questionsByCategory } from './data/questions';
import type { AnswerRecord, PracticeMode, PracticeSession, Question, QuestionCategory } from './types';
import { checkAnswer } from './utils/answer';
import {
  addWrongQuestion,
  appendAnswerToSession,
  createPracticeSession,
  finishSession,
  getPracticeSessionById,
  getPracticeSessions,
  getTrainingStats,
  getWrongQuestions,
  isPersistentStorageAvailable,
  markWrongQuestionCorrect,
  updateStatsWithAnswer,
} from './utils/recordStorage';
import { createQuestionQueue } from './utils/shuffle';

type Route =
  | { page: 'home' }
  | { page: 'categories'; mode: PracticeMode }
  | { page: 'quiz'; mode: PracticeMode; category: QuestionCategory }
  | { page: 'records' }
  | { page: 'recordDetail'; id: string };

const categories = Object.keys(categoryLabels) as QuestionCategory[];
const QUIZ_QUESTION_LIMIT = 10;

const parseHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  const availableModes: PracticeMode[] = ['practice', 'wrongReview'];

  if (parts[0] === 'categories') {
    const mode = parts[1] as PracticeMode;
    return availableModes.includes(mode)
      ? { page: 'categories', mode }
      : { page: 'home' };
  }

  if (parts[0] === 'quiz') {
    const mode = parts[1] as PracticeMode;
    const category = parts[2] as QuestionCategory;
    return availableModes.includes(mode) && categories.includes(category)
      ? { page: 'quiz', mode, category }
      : { page: 'home' };
  }

  if (parts[0] === 'records' && parts[1]) {
    return { page: 'recordDetail', id: parts[1] };
  }

  if (parts[0] === 'records') {
    return { page: 'records' };
  }

  return { page: 'home' };
};

const navigate = (path: string) => {
  window.location.hash = path;
};

const useMobileKeypad = () => {
  const getIsMobileKeypad = () =>
    window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches;
  const [isMobileKeypad, setIsMobileKeypad] = useState(getIsMobileKeypad);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)');
    const update = () => setIsMobileKeypad(media.matches);

    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isMobileKeypad;
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const getQuestionDisplayAnswer = (question: Question) => question.displayAnswer ?? question.correctAnswer;
const getModeLabel = (mode: string) => modeLabels[mode as PracticeMode] ?? '历史记录';

const getActiveWrongQuestionsByCategory = (category: QuestionCategory) =>
  getWrongQuestions()
    .filter((item) => item.category === category)
    .map((item) => getQuestionById(item.questionId))
    .filter((question): question is Question => question !== undefined && question.category === category);

const createTenQuestionQueue = (
  questions: readonly Question[],
  category: QuestionCategory,
  mode: PracticeMode,
) => {
  if (questions.length === 0) {
    return [];
  }

  if (mode === 'wrongReview') {
    return createQuestionQueue(questions).slice(0, QUIZ_QUESTION_LIMIT);
  }

  const wrongQuestions = createQuestionQueue(getActiveWrongQuestionsByCategory(category)).slice(
    0,
    QUIZ_QUESTION_LIMIT,
  );
  const wrongQuestionIds = new Set(wrongQuestions.map((question) => question.id));
  const fillQuestions = createQuestionQueue(
    questions.filter((question) => !wrongQuestionIds.has(question.id)),
  ).slice(0, Math.max(0, QUIZ_QUESTION_LIMIT - wrongQuestions.length));

  return createQuestionQueue([...wrongQuestions, ...fillQuestions]);
};

const Header = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <header className="topbar">
    {onBack ? (
      <button className="iconButton" type="button" onClick={onBack} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
    ) : (
      <span className="topbarSpacer" />
    )}
    <h1>{title}</h1>
    <span className="topbarSpacer" />
  </header>
);

const HomePage = () => {
  const [stats, setStats] = useState(getTrainingStats);
  const [storageAvailable] = useState(isPersistentStorageAvailable);

  useEffect(() => {
    const refresh = () => setStats(getTrainingStats());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  return (
    <main className="screen homeScreen">
      <section className="brandBlock">
        <div className="brandIcon">
          <Sparkles size={28} />
        </div>
        <div>
          <p className="eyebrow">移动端 H5 刷题</p>
          <h1>速算练习</h1>
        </div>
      </section>

      <section className="statsBand" aria-label="总统计">
        <div>
          <strong>{stats.total}</strong>
          <span>累计答题</span>
        </div>
        <div>
          <strong>{stats.correct}</strong>
          <span>答对</span>
        </div>
        <div>
          <strong>{stats.accuracy}%</strong>
          <span>正确率</span>
        </div>
      </section>

      {!storageAvailable && (
        <section className="storageWarning">
          当前浏览器限制了本地存储，刷题记录可能无法在下次打开时保留。
        </section>
      )}

      <nav className="actionList" aria-label="首页导航">
        <button type="button" onClick={() => navigate('/categories/practice')}>
          <BookOpen size={22} />
          <span>练习模式</span>
          <ChevronRight size={18} />
        </button>
        <button type="button" onClick={() => navigate('/categories/wrongReview')}>
          <RotateCcw size={22} />
          <span>错题复习</span>
          <ChevronRight size={18} />
        </button>
        <button type="button" onClick={() => navigate('/records')}>
          <History size={22} />
          <span>刷题记录</span>
          <ChevronRight size={18} />
        </button>
      </nav>
    </main>
  );
};

const CategoryPage = ({ mode }: { mode: PracticeMode }) => {
  const wrongQuestions = getWrongQuestions();

  return (
    <main className="screen">
      <Header title={getModeLabel(mode)} onBack={() => navigate('/')} />

      <div className="categoryList">
        {categories.map((category) => {
          const wrongCount = wrongQuestions.filter((item) => item.category === category).length;

          return (
            <button
              className="categoryItem"
              key={category}
              type="button"
              onClick={() => navigate(`/quiz/${mode}/${category}`)}
            >
              <div>
                <strong>{categoryLabels[category]}</strong>
                {mode === 'wrongReview' && <span>错题 {wrongCount} 道</span>}
              </div>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </div>
    </main>
  );
};

const QuizPage = ({ mode, category }: { mode: PracticeMode; category: QuestionCategory }) => {
  const sessionRef = useRef<PracticeSession | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<number>();
  const focusTimerRef = useRef<number>();
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<PracticeSession | null>(null);
  const isMobileKeypad = useMobileKeypad();

  const sourceQuestions = useMemo(() => {
    if (mode === 'wrongReview') {
      return getActiveWrongQuestionsByCategory(category);
    }

    return questionsByCategory[category];
  }, [category, mode]);

  const currentQuestion = queue[index];

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
      if (sessionRef.current) {
        finishSession(sessionRef.current.id);
      }
    };
  }, []);

  const focusAnswerInput = (delay = 100) => {
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = window.setTimeout(() => {
      inputRef.current?.focus();
    }, delay);
  };

  useEffect(() => {
    if (!started || finished || feedback === 'wrong' || !currentQuestion) {
      return;
    }

    focusAnswerInput();

    return () => {
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, [currentQuestion?.id, started, finished, feedback]);

  const startQuiz = () => {
    const session = createPracticeSession(category, mode);
    const nextQueue = createTenQuestionQueue(sourceQuestions, category, mode);

    flushSync(() => {
      sessionRef.current = session;
      setQueue(nextQueue);
      setIndex(0);
      setAnswer('');
      setFeedback('');
      setSubmitted(false);
      setStarted(true);
      setFinished(nextQueue.length === 0);
      setSummary(nextQueue.length === 0 ? session : null);
    });

    if (nextQueue.length === 0) {
      finishSession(session.id);
      return;
    }

    focusAnswerInput(0);
  };

  const resetQuestionState = () => {
    setAnswer('');
    setFeedback('');
    setSubmitted(false);
  };

  const completeQuiz = () => {
    if (!sessionRef.current) {
      return;
    }

    finishSession(sessionRef.current.id);
    const session = getPracticeSessionById(sessionRef.current.id) ?? sessionRef.current;
    setSummary(session);
    setFinished(true);
  };

  const goNext = () => {
    if (index + 1 >= queue.length) {
      completeQuiz();
      return;
    }

    setIndex((value) => value + 1);
    resetQuestionState();
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !sessionRef.current || submitted || answer.trim() === '') {
      return;
    }

    const isCorrect = checkAnswer(currentQuestion, answer);
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      userAnswer: answer.trim(),
      correctAnswer: getQuestionDisplayAnswer(currentQuestion),
      isCorrect,
      answeredAt: new Date().toISOString(),
      category,
      mode,
    };

    const updatedSession = appendAnswerToSession(sessionRef.current.id, record);
    updateStatsWithAnswer(isCorrect);

    if (isCorrect) {
      markWrongQuestionCorrect(currentQuestion.id);
      setFeedback('correct');
      setSubmitted(true);
      timeoutRef.current = window.setTimeout(goNext, 450);
      return;
    }

    addWrongQuestion(record);
    setFeedback('wrong');
    setSubmitted(true);
    setSummary(updatedSession ?? null);
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmitAnswer();
  };

  const inputKeypadValue = (value: string) => {
    if (submitted) {
      return;
    }

    setAnswer((current) => `${current}${value}`);
    focusAnswerInput(0);
  };

  const backspaceAnswer = () => {
    if (submitted) {
      return;
    }

    setAnswer((current) => current.slice(0, -1));
    focusAnswerInput(0);
  };

  const clearAnswer = () => {
    if (submitted) {
      return;
    }

    setAnswer('');
    focusAnswerInput(0);
  };

  if (finished) {
    const wrongAnswers = summary?.answers.filter((item) => !item.isCorrect) ?? [];

    return (
      <main className="screen">
        <Header title="本次完成" onBack={() => navigate('/')} />
        <section className="finishPanel">
          <Trophy size={36} />
          <h2>{summary?.total ? '刷题结束' : '暂无可刷题目'}</h2>
          <div className="finishStats">
            <span>答题 {summary?.total ?? 0}</span>
            <span>正确 {summary?.correct ?? 0}</span>
            <span>错误 {summary?.wrong ?? 0}</span>
            <span>正确率 {summary?.accuracy ?? 0}%</span>
          </div>
        </section>
        {wrongAnswers.length > 0 && (
          <section className="wrongSummary">
            <div className="sectionTitle">
              <h2>本次错题</h2>
              <span>{wrongAnswers.length} 道</span>
            </div>
            <div className="answerList">
              {wrongAnswers.map((answer, answerIndex) => (
                <article
                  className="answerItem"
                  key={`${answer.questionId}-${answer.answeredAt}-${answerIndex}`}
                >
                  <div className="answerTop">
                    <strong>{answer.questionText}</strong>
                    <span className="tagWrong">错误</span>
                  </div>
                  <p>我的答案：{answer.userAnswer}</p>
                  <p>正确答案：{answer.correctAnswer}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="footerActions">
          <button type="button" onClick={() => navigate(`/records/${sessionRef.current?.id ?? ''}`)}>
            <ClipboardList size={18} />
            查看本次记录
          </button>
          <button className="secondaryButton" type="button" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </main>
    );
  }

  if (!started) {
    const startLabel = mode === 'practice' ? '开始练习' : '开始错题复习';

    return (
      <main className="screen">
        <Header title={categoryLabels[category]} onBack={() => navigate(`/categories/${mode}`)} />
        <section className="finishPanel startPanel">
          <BookOpen size={36} />
          <h2>{startLabel}</h2>
          <div className="finishStats">
            <span>{getModeLabel(mode)}</span>
            <span>本次 {Math.min(sourceQuestions.length, QUIZ_QUESTION_LIMIT)} 题</span>
          </div>
        </section>
        <div className="footerActions">
          <button type="button" onClick={startQuiz}>
            <CheckCircle2 size={18} />
            {startLabel}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen quizScreen">
      <Header title={categoryLabels[category]} onBack={() => navigate(`/categories/${mode}`)} />
      <section className="progressLine">
        <span>{getModeLabel(mode)}</span>
        <strong>{index + 1}/{queue.length}</strong>
      </section>

      <section className="questionBlock">
        <p>题目</p>
        <h2>{currentQuestion?.text}</h2>
      </section>

      <form className="answerForm" onSubmit={submitAnswer} noValidate>
        <label htmlFor="answer">我的答案</label>
        <input
          ref={inputRef}
          id="answer"
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          readOnly={isMobileKeypad}
          disabled={submitted}
          placeholder="输入答案"
        />
        <button className="answerSubmitButton" type="submit" disabled={submitted || answer.trim() === ''}>
          <CheckCircle2 size={18} />
          提交答案
        </button>
      </form>

      {isMobileKeypad && !submitted && (
        <NumericKeypad
          disabled={submitted}
          submitDisabled={submitted || answer.trim() === ''}
          onInput={inputKeypadValue}
          onBackspace={backspaceAnswer}
          onClear={clearAnswer}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {feedback && (
        <section className={`feedback ${feedback}`}>
          {feedback === 'correct' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          <div>
            <strong>{feedback === 'correct' ? '回答正确' : '回答错误'}</strong>
            {feedback === 'wrong' && <span>正确答案：{getQuestionDisplayAnswer(currentQuestion)}</span>}
          </div>
        </section>
      )}

      {feedback === 'wrong' && (
        <div className="footerActions sticky">
          <button type="button" onClick={goNext}>
            <ChevronRight size={18} />
            下一题
          </button>
        </div>
      )}
    </main>
  );
};

const RecordsPage = () => {
  const [sessions] = useState(getPracticeSessions);

  return (
    <main className="screen">
      <Header title="刷题记录" onBack={() => navigate('/')} />
      {sessions.length === 0 ? (
        <section className="emptyState">暂无刷题记录</section>
      ) : (
        <div className="recordList">
          {sessions.map((session) => (
            <button
              className="recordItem"
              key={session.id}
              type="button"
              onClick={() => navigate(`/records/${session.id}`)}
            >
              <div className="recordTop">
                <strong>{formatTime(session.startedAt)}</strong>
                <span>{session.accuracy}%</span>
              </div>
              <div className="recordMeta">
                <span>{categoryLabels[session.category]}</span>
                <span>{getModeLabel(session.mode)}</span>
              </div>
              <div className="recordNumbers">
                <span>答题 {session.total}</span>
                <span>正确 {session.correct}</span>
                <span>错误 {session.wrong}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
};

const RecordDetailPage = ({ id }: { id: string }) => {
  const session = getPracticeSessionById(id);

  if (!session) {
    return (
      <main className="screen">
        <Header title="记录详情" onBack={() => navigate('/records')} />
        <section className="emptyState">没有找到这条刷题记录</section>
      </main>
    );
  }

  return (
    <main className="screen">
      <Header title="记录详情" onBack={() => navigate('/records')} />
      <section className="detailSummary">
        <h2>{categoryLabels[session.category]}</h2>
        <p>
          {getModeLabel(session.mode)} · {formatTime(session.startedAt)}
        </p>
        <div>
          <span>答题 {session.total}</span>
          <span>正确 {session.correct}</span>
          <span>错误 {session.wrong}</span>
          <span>正确率 {session.accuracy}%</span>
        </div>
      </section>

      {session.answers.length === 0 ? (
        <section className="emptyState">本次还没有答题明细</section>
      ) : (
        <div className="answerList">
          {session.answers.map((answer, index) => (
            <article className="answerItem" key={`${answer.questionId}-${answer.answeredAt}-${index}`}>
              <div className="answerTop">
                <strong>{answer.questionText}</strong>
                <span className={answer.isCorrect ? 'tagCorrect' : 'tagWrong'}>
                  {answer.isCorrect ? '正确' : '错误'}
                </span>
              </div>
              <p>我的答案：{answer.userAnswer}</p>
              <p>正确答案：{answer.correctAnswer}</p>
              <time>{formatTime(answer.answeredAt)}</time>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      navigate('/');
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.page === 'categories') {
    return <CategoryPage mode={route.mode} />;
  }

  if (route.page === 'quiz') {
    return <QuizPage key={`${route.mode}-${route.category}-${window.location.hash}`} mode={route.mode} category={route.category} />;
  }

  if (route.page === 'records') {
    return <RecordsPage />;
  }

  if (route.page === 'recordDetail') {
    return <RecordDetailPage id={route.id} />;
  }

  return <HomePage />;
}
