import "./LessonQuiz.css";
import { useState } from "react";

const COUNT = 10; // hər cəhddə neçə sual
const PASS = 70; // keçid faizi (bloklamır, yalnız mesaj üçündür)

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

export default function LessonQuiz({ bank }) {
  const [round, setRound] = useState(null); // null = başlanğıc ekranı
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);

  if (!Array.isArray(bank) || bank.length === 0) return null;

  function start() {
    setRound(makeRound(bank));
    setIndex(0);
    setPicked(null);
    setChecked(false);
    setResults([]);
  }

  // Başlanğıc ekranı
  if (!round) {
    return (
      <div className="lq">
        <h2>Quiz</h2>
        <p>
          You will get {Math.min(COUNT, bank.length)} random questions about this lesson. Each time you start, the
          questions and the order of the answers are different.
        </p>
        <div className="lq-actions">
          <button type="button" className="lq-btn is-primary" onClick={start}>
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  // Nəticə ekranı
  if (index >= round.length) {
    const score = results.filter((r) => r.ok).length;
    const percent = Math.round((score / round.length) * 100);
    const passed = percent >= PASS;
    const missed = results.filter((r) => !r.ok);

    return (
      <div className="lq">
        <h2>Your result</h2>
        <div className={"lq-score" + (passed ? " is-pass" : " is-low")}>
          <strong>
            {score} / {round.length}
          </strong>
          <span>{percent}%</span>
        </div>
        <p>
          {passed
            ? "Great work! You understand this lesson well."
            : "Review the lesson and try again. A different set of questions is waiting for you."}
        </p>

        {missed.length > 0 && (
          <div className="lq-missed">
            <h3>Questions to review</h3>
            <ul>
              {missed.map((r, i) => (
                <li key={i}>
                  <p className="lq-missed-q">{r.q}</p>
                  <p>
                    <span className="lq-tag is-wrong">Your answer</span> {r.yours}
                  </p>
                  <p>
                    <span className="lq-tag is-right">Correct answer</span> {r.correct}
                  </p>
                  <p className="lq-why">{r.why}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

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

  function check() {
    const chosen = item.options[picked];
    const right = item.options.find((o) => o.correct);
    setChecked(true);
    setResults((prev) => [
      ...prev,
      { q: item.q, ok: chosen.correct, yours: chosen.text, correct: right.text, why: item.why },
    ]);
  }

  function next() {
    setIndex(index + 1);
    setPicked(null);
    setChecked(false);
  }

  const ok = checked && item.options[picked].correct;

  return (
    <div className="lq">
      <div className="lq-top">
        <span>
          Question {index + 1} of {round.length}
        </span>
        <div className="lq-bar" aria-hidden="true">
          <div className="lq-bar-fill" style={{ width: (index / round.length) * 100 + "%" }} />
        </div>
      </div>

      <fieldset className="lq-field">
        <legend>{item.q}</legend>
        {item.options.map((o, i) => {
          let cls = "lq-opt";
          if (picked === i) cls += " is-picked";
          if (checked && o.correct) cls += " is-correct";
          if (checked && picked === i && !o.correct) cls += " is-wrong";
          return (
            <label key={index + "-" + i} className={cls}>
              <input
                type="radio"
                name={"q" + index}
                checked={picked === i}
                disabled={checked}
                onChange={() => setPicked(i)}
              />
              <span>{o.text}</span>
            </label>
          );
        })}
      </fieldset>

      {checked && (
        <div className={"lq-feedback " + (ok ? "is-ok" : "is-no")} role="status">
          <strong>{ok ? "Correct!" : "Not quite."}</strong> {item.why}
        </div>
      )}

      <div className="lq-actions">
        {!checked ? (
          <button type="button" className="lq-btn is-primary" onClick={check} disabled={picked === null}>
            Check answer
          </button>
        ) : (
          <button type="button" className="lq-btn is-primary" onClick={next}>
            {last ? "See result" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}