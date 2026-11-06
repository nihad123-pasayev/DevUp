import "./LessonQuiz.css";
import { useState } from "react";

const COUNT = 10; // hər cəhddə neçə sual
const PASS = 70; // keçid faizi

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bankdan təsadüfi suallar seçir və variantların sırasını qarışdırır
function makeRound(bank) {
  return shuffle(bank)
    .slice(0, COUNT)
    .map((item) => ({
      q: item.q,
      why: item.why,
      options: shuffle(item.options.map((text, i) => ({ text, correct: i === item.answer }))),
    }));
}

export default function LessonQuiz({ bank, passed, onPass }) {
  const [round, setRound] = useState(null); // null = başlanğıc ekranı
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // hər sual üçün seçilmiş variantın nömrəsi
  const [done, setDone] = useState(false);

  if (!Array.isArray(bank) || bank.length === 0) return null;

  function start() {
    const r = makeRound(bank);
    setRound(r);
    setAnswers(r.map(() => null));
    setIndex(0);
    setDone(false);
  }

  // Başlanğıc ekranı
  if (!round) {
    return (
      <div className="lq">
        <h2>Quiz</h2>
        <p>
          You will get {Math.min(COUNT, bank.length)} random questions about this lesson. Answer all of them, then
          press <strong>Check answers</strong> at the end. You need at least {PASS}% to continue.
        </p>
        {passed && <p className="lq-passed">You already passed this quiz. You can retake it any time.</p>}
        <div className="lq-actions">
          <button type="button" className="lq-btn is-primary" onClick={start}>
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  // Nəticə ekranı
  if (done) {
    const rows = round.map((item, i) => {
      const chosen = item.options[answers[i]];
      const right = item.options.find((o) => o.correct);
      return {
        q: item.q,
        why: item.why,
        ok: chosen ? chosen.correct : false,
        yours: chosen ? chosen.text : "(no answer)",
        correct: right.text,
      };
    });
    const score = rows.filter((r) => r.ok).length;
    const percent = Math.round((score / rows.length) * 100);
    const pass = percent >= PASS;

    return (
      <div className="lq">
        <h2>Your result</h2>
        <div className={"lq-score" + (pass ? " is-pass" : " is-low")}>
          <strong>
            {score} / {rows.length}
          </strong>
          <span>{percent}%</span>
        </div>
        <p>
          {pass
            ? "Great work! You passed, so you can continue to the next part."
            : `You need at least ${PASS}% to continue. Review the lesson and try again. A different set of questions is waiting for you.`}
        </p>

        <div className="lq-missed">
          <h3>Answers</h3>
          <ul>
            {rows.map((r, i) => (
              <li key={i} className={r.ok ? "is-ok" : "is-no"}>
                <p className="lq-missed-q">
                  {i + 1}. {r.q}
                </p>
                {!r.ok && (
                  <p>
                    <span className="lq-tag is-wrong">Your answer</span> {r.yours}
                  </p>
                )}
                <p>
                  <span className="lq-tag is-right">Correct answer</span> {r.correct}
                </p>
                <p className="lq-why">{r.why}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lq-actions">
          <button type="button" className="lq-btn is-primary" onClick={start}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Sual ekranı
  const item = round[index];
  const last = index === round.length - 1;
  const answered = answers.filter((a) => a !== null).length;
  const allAnswered = answered === round.length;

  function pick(i) {
    setAnswers((prev) => prev.map((a, k) => (k === index ? i : a)));
  }

  function check() {
    const score = round.filter((it, i) => it.options[answers[i]]?.correct).length;
    const percent = Math.round((score / round.length) * 100);
    setDone(true);
    if (percent >= PASS && onPass) onPass();
  }

  return (
    <div className="lq">
      <div className="lq-top">
        <span>
          Question {index + 1} of {round.length} · {answered} answered
        </span>
        <div className="lq-bar" aria-hidden="true">
          <div className="lq-bar-fill" style={{ width: (answered / round.length) * 100 + "%" }} />
        </div>
      </div>

      <fieldset className="lq-field">
        <legend>{item.q}</legend>
        {item.options.map((o, i) => (
          <label key={index + "-" + i} className={"lq-opt" + (answers[index] === i ? " is-picked" : "")}>
            <input type="radio" name={"q" + index} checked={answers[index] === i} onChange={() => pick(i)} />
            <span>{o.text}</span>
          </label>
        ))}
      </fieldset>

      {last && !allAnswered && (
        <p className="lq-note">Answer all questions to check your answers. Use Previous to go back.</p>
      )}

      <div className="lq-actions">
        {index > 0 && (
          <button type="button" className="lq-btn is-ghost" onClick={() => setIndex(index - 1)}>
            Previous
          </button>
        )}
        {last ? (
          <button type="button" className="lq-btn is-primary" onClick={check} disabled={!allAnswered}>
            Check answers
          </button>
        ) : (
          <button type="button" className="lq-btn is-primary" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}