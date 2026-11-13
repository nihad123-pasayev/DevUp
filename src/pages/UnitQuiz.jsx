import { useEffect, useState } from "react";
import "./UnitQuiz.css";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function UnitQuiz({
  questions = [],
  partSize = 10,
  passPercent = 70,
  passed = false,
  onPassed,
  onContinue,
  onActive,
}) {
  const total = questions.length;
  const partCount = Math.ceil(total / partSize);

  const [answers, setAnswers] = useState({});
  const [partIndex, setPartIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [retaking, setRetaking] = useState(false);

  const answeredTotal = Object.keys(answers).length;

  // LessonPage: quiz davam edərkən səhifədən çıxışda xəbərdarlıq üçün
  useEffect(() => {
    if (onActive) onActive(answeredTotal > 0 && !result);
  }, [answeredTotal, result, onActive]);

  useEffect(() => {
    return () => {
      if (onActive) onActive(false);
    };
  }, [onActive]);

  if (total === 0) {
    return <p className="uq-empty">This quiz has no questions yet.</p>;
  }

  /* ---------- ARTIQ KEÇİLİB ---------- */
  if (passed && !retaking && !result) {
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

  const start = partIndex * partSize;
  const end = Math.min(start + partSize, total);
  const partQuestions = questions.slice(start, end);
  const isLastPart = partIndex === partCount - 1;
  const partDone = partQuestions.every((_, i) => answers[start + i] !== undefined);
  const allDone = answeredTotal === total;
  const needed = Math.ceil((passPercent * total) / 100);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function choose(qIndex, optionIndex) {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  }

  function goToPart(index) {
    setPartIndex(index);
    scrollTop();
  }

  function checkAnswers() {
    let score = 0;
    questions.forEach((item, i) => {
      if (answers[i] === item.answer) score += 1;
    });
    const percent = Math.round((score / total) * 100);
    const didPass = score * 100 >= passPercent * total;
    setResult({ score, percent, passed: didPass });
    setShowReview(false);
    scrollTop();
    if (didPass && onPassed) onPassed({ score, total, percent });
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setShowReview(false);
    setPartIndex(0);
    scrollTop();
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
  return (
    <div className="uq">
      <div className="uq-head">
        <div className="uq-head-row">
          <h2 className="uq-part">
            Part {partIndex + 1} of {partCount}
          </h2>
          <span className="uq-count">
            {answeredTotal} / {total} answered
          </span>
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
            <button type="button" className="uq-btn uq-btn--ghost" onClick={() => goToPart(partIndex - 1)}>
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
              onClick={checkAnswers}
            >
              Check answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}