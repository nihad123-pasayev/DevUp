import { useEffect, useRef, useState } from "react";
import "./UnitQuiz.css";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

export default function UnitQuiz({
  questions = [],
  partSize = 10,
  passPercent = 70,
  timeLimitMinutes = 60,
  passed = false,
  onPassed,
  onContinue,
  onActive,
}) {
  const total = questions.length;
  const partCount = Math.ceil(total / partSize);
  const limitSeconds = timeLimitMinutes * 60;

  const [answers, setAnswers] = useState({});
  const [partIndex, setPartIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [started, setStarted] = useState(false);
  const [endAt, setEndAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(limitSeconds);

  const answersRef = useRef({});
  const finishRef = useRef(null);
  const doneRef = useRef(false);

  const answeredTotal = Object.keys(answers).length;
  const needed = Math.ceil((passPercent * total) / 100);
  const timeLabel = timeLimitMinutes === 60 ? "1 hour" : `${timeLimitMinutes} minutes`;

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startQuiz() {
    setAnswers({});
    setPartIndex(0);
    setResult(null);
    setShowReview(false);
    setSecondsLeft(limitSeconds);
    setEndAt(Date.now() + limitSeconds * 1000);
    doneRef.current = false;
    setStarted(true);
    scrollTop();
  }

  function finish(timeUp) {
    if (doneRef.current) return;
    doneRef.current = true;
    const current = answersRef.current;
    let score = 0;
    questions.forEach((item, i) => {
      if (current[i] === item.answer) score += 1;
    });
    const percent = Math.round((score / total) * 100);
    const didPass = score * 100 >= passPercent * total;
    setResult({ score, percent, passed: didPass, timeUp });
    setShowReview(false);
    scrollTop();
    if (didPass && onPassed) onPassed({ score, total, percent });
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setShowReview(false);
    setPartIndex(0);
    setStarted(false);
    scrollTop();
  }

  function choose(qIndex, optionIndex) {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  }

  function goToPart(index) {
    setPartIndex(index);
    scrollTop();
  }

  // ən son cavabları və finish funksiyasını taymer üçün saxla
  useEffect(() => {
    answersRef.current = answers;
    finishRef.current = finish;
  });

  // geri sayım: vaxt bitəndə avtomatik yoxlanır
  useEffect(() => {
    if (!started || result) return undefined;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && finishRef.current) finishRef.current(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [started, result, endAt]);

  // LessonPage: quiz davam edərkən səhifədən çıxışda xəbərdarlıq üçün
  useEffect(() => {
    if (onActive) onActive(started && !result);
  }, [started, result, onActive]);

  useEffect(() => {
    return () => {
      if (onActive) onActive(false);
    };
  }, [onActive]);

  if (total === 0) {
    return <p className="uq-empty">This quiz has no questions yet.</p>;
  }

  /* ---------- ARTIQ KEÇİLİB ---------- */
  if (passed && !retaking && !started && !result) {
    return (
      <div className="uq">
        <div className="uq-result uq-result--pass">
          <h2 className="uq-result-title">You already passed this quiz</h2>
          <p className="uq-result-text">
            You can retake it any time to practice. Your progress stays saved.
          </p>
          <div className="uq-actions uq-actions--center">
            <button
              type="button"
              className="uq-btn uq-btn--ghost"
              onClick={() => setRetaking(true)}
            >
              Retake quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- BAŞLANĞIC EKRANI ---------- */
  if (!started && !result) {
    return (
      <div className="uq">
        <div className="uq-start">
          <h2 className="uq-start-title">Unit quiz</h2>
          <ul className="uq-rules">
            <li>
              <strong>{total} questions</strong> in {partCount} parts
            </li>
            <li>
              <strong>{timeLabel}</strong> in total. The timer starts when you press the button, and
              your answers are checked automatically when time runs out
            </li>
            <li>
              Pass mark: <strong>{passPercent}%</strong> ({needed} of {total} correct answers)
            </li>
            <li>Unanswered questions count as incorrect</li>
            <li>If you leave this page during the quiz, your answers will be lost</li>
          </ul>
          <button type="button" className="uq-btn uq-btn--primary" onClick={startQuiz}>
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  /* ---------- NƏTİCƏ ---------- */
  if (result) {
    return (
      <div className="uq">
        <div className={"uq-result " + (result.passed ? "uq-result--pass" : "uq-result--fail")}>
          <p className="uq-result-score">
            {result.score} / {total}
          </p>
          <h2 className="uq-result-title">{result.passed ? "You passed" : "Not passed yet"}</h2>
          {result.timeUp && (
            <p className="uq-result-text">Time is up. Your answers were checked automatically.</p>
          )}
          <p className="uq-result-text">
            {result.passed
              ? `You scored ${result.percent}%. The pass mark is ${passPercent}%, so the next unit is unlocked.`
              : `You scored ${result.percent}%. You need at least ${passPercent}% (${needed} of ${total} correct answers) to continue. You can try again.`}
          </p>

          <div className="uq-actions uq-actions--center">
            {result.passed && onContinue && (
              <button type="button" className="uq-btn uq-btn--primary" onClick={onContinue}>
                Continue
              </button>
            )}
            {!result.passed && (
              <button type="button" className="uq-btn uq-btn--primary" onClick={retry}>
                Try again
              </button>
            )}
            <button
              type="button"
              className="uq-btn uq-btn--ghost"
              onClick={() => setShowReview((v) => !v)}
            >
              {showReview ? "Hide answers" : "Review answers"}
            </button>
          </div>
        </div>

        {showReview && (
          <div className="uq-review">
            {questions.map((item, qIndex) => (
              <div key={qIndex} className="uq-question">
                <p className="uq-q-text">
                  <span className="uq-q-num">{qIndex + 1}</span>
                  {item.q}
                </p>
                <div className="uq-options">
                  {item.options.map((option, o) => {
                    let state = "";
                    if (o === item.answer) state = " uq-option--correct";
                    else if (o === answers[qIndex]) state = " uq-option--wrong";
                    return (
                      <div key={o} className={"uq-option uq-option--static" + state}>
                        <span className="uq-letter">{LETTERS[o]}</span>
                        <span className="uq-option-text">{option}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="uq-why">
                  <strong>{answers[qIndex] === item.answer ? "Correct. " : "Explanation. "}</strong>
                  {item.why}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- SUALLAR ---------- */
  const start = partIndex * partSize;
  const end = Math.min(start + partSize, total);
  const partQuestions = questions.slice(start, end);
  const isLastPart = partIndex === partCount - 1;
  const partDone = partQuestions.every((_, i) => answers[start + i] !== undefined);
  const allDone = answeredTotal === total;

  return (
    <div className="uq">
      <div className="uq-head">
        <div className="uq-head-row">
          <h2 className="uq-part">
            Part {partIndex + 1} of {partCount}
          </h2>
          <div className="uq-head-right">
            <span className="uq-count">
              {answeredTotal} / {total} answered
            </span>
            <span
              className={"uq-timer" + (secondsLeft <= 300 ? " uq-timer--low" : "")}
              role="timer"
              aria-label="Time left"
            >
              {formatTime(secondsLeft)}
            </span>
          </div>
        </div>
        <div className="uq-bar">
          <div className="uq-bar-fill" style={{ width: `${(answeredTotal / total) * 100}%` }} />
        </div>
      </div>

      {partQuestions.map((item, i) => {
        const qIndex = start + i;
        return (
          <div
            key={qIndex}
            className="uq-question"
            role="radiogroup"
            aria-labelledby={`uq-q-${qIndex}`}
          >
            <p className="uq-q-text" id={`uq-q-${qIndex}`}>
              <span className="uq-q-num">{qIndex + 1}</span>
              {item.q}
            </p>
            <div className="uq-options">
              {item.options.map((option, o) => (
                <label
                  key={o}
                  className={"uq-option" + (answers[qIndex] === o ? " uq-option--selected" : "")}
                >
                  <input
                    type="radio"
                    name={`uq-${qIndex}`}
                    checked={answers[qIndex] === o}
                    onChange={() => choose(qIndex, o)}
                  />
                  <span className="uq-letter">{LETTERS[o]}</span>
                  <span className="uq-option-text">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="uq-footer">
        <p className="uq-hint">
          {isLastPart
            ? allDone
              ? "All questions are answered. You can check your answers now."
              : "Answer every question to check your answers."
            : partDone
            ? "Part complete. Move on when you are ready."
            : "Answer every question in this part to continue."}
        </p>
        <div className="uq-actions">
          {partIndex > 0 && (
            <button
              type="button"
              className="uq-btn uq-btn--ghost"
              onClick={() => goToPart(partIndex - 1)}
            >
              Previous part
            </button>
          )}
          {!isLastPart && (
            <button
              type="button"
              className="uq-btn uq-btn--primary"
              disabled={!partDone}
              onClick={() => goToPart(partIndex + 1)}
            >
              Next part
            </button>
          )}
          {isLastPart && (
            <button
              type="button"
              className="uq-btn uq-btn--primary"
              disabled={!allDone}
              onClick={() => finish(false)}
            >
              Check answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}