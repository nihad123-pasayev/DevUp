import Sidebar from "../Sidebar";
import "./Help.css";

const TABS = [
  { id: "faq", label: "FAQ" },
  { id: "assistant", label: "Assistant" },
  { id: "contact", label: "Contact us" },
  { id: "feedback", label: "Feedback" },
];

const CATEGORIES = [
  "All",
  "Getting started",
  "Account",
  "Lessons",
  "Community",
  "Certificates",
];

// Cavab mətnləri nümunədir, sonra özün dəyişə bilərsən
const FAQ = [
  {
    category: "Getting started",
    q: "What is a roadmap and how do I add one?",
    a: "A roadmap is a step-by-step path through one field, such as Frontend or Backend. Open Lessons, pick a roadmap and choose Add roadmap. It then appears on your Dashboard.",
  },
  {
    category: "Getting started",
    q: "Where can I find the things I bookmarked?",
    a: "Everything you bookmark appears under Saved in the sidebar. Use the tabs there to filter by type.",
  },
  {
    category: "Certificates",
    q: "How do I earn a certificate?",
    a: "Finish every lesson in a roadmap. The certificate then appears under Certificates, where you can view it and download it as a PDF.",
  },
  {
    category: "Account",
    q: "How do I reset my progress?",
    a: "Open Settings, go to Account and find the Danger zone. Reset progress clears your lesson progress but keeps your account.",
  },
  {
    category: "Account",
    q: "How do I change my password?",
    a: "Open Settings, go to Account and choose Change password. If you signed in with Google or GitHub, manage your password with that provider.",
  },
  {
    category: "Community",
    q: "How do I ask a question in the community?",
    a: "Open Community, choose Ask a question, pick a field, write a title and details, then post. You can mark the best answer as solved.",
  },
];

const PROMPTS = [
  "How do I earn a certificate?",
  "How do I reset my progress?",
  "How do I change my password?",
];

const CONTACT_TYPES = ["Question", "Report a bug", "Account issue"];

const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Great"];

export default function Help() {
  return (
    <div className="help-layout">
      <Sidebar />
      <main className="help-main">
        <div className="help-page">
          <header className="help-header">
            <h1>Help</h1>
            <p>Find answers, chat with the assistant or get in touch.</p>
          </header>

          <div className="help-tabset">
            {TABS.map((t) => (
              <input
                key={t.id}
                className="help-tab-input"
                type="radio"
                name="help-tab"
                id={"help-tab-" + t.id}
                defaultChecked={t.id === "faq"}
              />
            ))}

            <div className="help-tabs">
              {TABS.map((t) => (
                <label
                  key={t.id}
                  className="help-tab"
                  htmlFor={"help-tab-" + t.id}
                >
                  {t.label}
                </label>
              ))}
            </div>

            <div className="help-panels">
              <section id="help-panel-faq" className="help-panel">
                <div className="help-search">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    aria-label="Search for help"
                    placeholder="Search for help"
                  />
                </div>

                <div className="help-pills">
                  {CATEGORIES.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      className={"help-pill" + (i === 0 ? " is-active" : "")}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="help-faq">
                  {FAQ.map((f) => (
                    <details className="help-faq-item" key={f.q}>
                      <summary>
                        <span className="help-faq-q">{f.q}</span>
                        <span className="help-faq-cat">{f.category}</span>
                      </summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section id="help-panel-assistant" className="help-panel">
                <div className="help-chat">
                  <div className="help-chat-head">
                    <span className="help-bot">D</span>
                    <div>
                      <h2>DevUp assistant</h2>
                      <p>Ask anything about using DevUp.</p>
                    </div>
                  </div>

                  <div className="help-chat-body">
                    <div className="help-msg">
                      <span className="help-bot is-small">D</span>
                      <div className="help-bubble">
                        Hi, I'm the DevUp assistant. What can I help you with?
                      </div>
                    </div>
                    <div className="help-msg is-user">
                      <div className="help-bubble">
                        How do I earn a certificate?
                      </div>
                    </div>
                    <div className="help-msg">
                      <span className="help-bot is-small">D</span>
                      <div className="help-bubble">
                        Finish every lesson in a roadmap. The certificate then
                        appears under Certificates, where you can view it and
                        download it as a PDF.
                      </div>
                    </div>
                  </div>

                  <div className="help-prompts">
                    {PROMPTS.map((p) => (
                      <button key={p} type="button" className="help-prompt">
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="help-chat-input">
                    <input
                      type="text"
                      aria-label="Message the assistant"
                      placeholder="Type your question"
                    />
                    <button type="button" className="help-primary">
                      Send
                    </button>
                  </div>
                </div>
              </section>

              <section id="help-panel-contact" className="help-panel">
                <div className="help-card">
                  <h2>Contact us</h2>
                  <p className="help-card-text">
                    Send us a message and we'll reply to the email on your
                    account.
                  </p>

                  <div
                    className="help-types"
                    role="radiogroup"
                    aria-label="Message type"
                  >
                    {CONTACT_TYPES.map((t, i) => (
                      <label className="help-type" key={t}>
                        <input
                          type="radio"
                          name="contact-type"
                          defaultChecked={i === 0}
                        />
                        <span className="help-type-box">{t}</span>
                      </label>
                    ))}
                  </div>

                  <div className="help-field">
                    <label htmlFor="contact-subject">Subject</label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="What's this about?"
                    />
                  </div>
                  <div className="help-field">
                    <label htmlFor="contact-message">Message</label>
                    <textarea
                      id="contact-message"
                      rows={6}
                      placeholder="Tell us what happened or what you need"
                    />
                  </div>
                  <div className="help-footer">
                    <button type="button" className="help-primary">
                      Send message
                    </button>
                  </div>
                </div>
              </section>

              <section id="help-panel-feedback" className="help-panel">
                <div className="help-card">
                  <h2>Feedback</h2>
                  <p className="help-card-text">
                    Tell us what's working and what isn't. You won't get a
                    reply, but we read everything.
                  </p>

                  <fieldset className="help-rating">
                    <legend>How's your experience with DevUp?</legend>
                    <div className="help-rating-row">
                      {RATING_LABELS.map((label, i) => (
                        <label className="help-rate" key={label}>
                          <input type="radio" name="rating" value={i + 1} />
                          <span className="help-rate-box">{i + 1}</span>
                          <span className="help-rate-label">{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="help-field">
                    <label htmlFor="feedback-like">What do you like?</label>
                    <textarea
                      id="feedback-like"
                      rows={3}
                      placeholder="Tell us what works well"
                    />
                  </div>
                  <div className="help-field">
                    <label htmlFor="feedback-improve">
                      What should we improve?
                    </label>
                    <textarea
                      id="feedback-improve"
                      rows={3}
                      placeholder="Tell us what to fix"
                    />
                  </div>
                  <div className="help-field">
                    <label htmlFor="feedback-feature">
                      Suggest a feature (optional)
                    </label>
                    <textarea
                      id="feedback-feature"
                      rows={3}
                      placeholder="What would you like to see in DevUp?"
                    />
                  </div>
                  <div className="help-footer">
                    <button type="button" className="help-primary">
                      Send feedback
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
