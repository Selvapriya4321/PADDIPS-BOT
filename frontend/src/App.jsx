
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://paddips-bot-1.onrender.com"
).replace(/\/+$/, "");

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(
      "Unable to connect. Check your internet connection and try again."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data
        ? data.detail || data.error || data.message
        : data;

    throw new Error(
      message || `Request failed (${response.status}). Please try again.`
    );
  }

  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return { response: data };
    }
  }

  return data;
}

function getText(data) {
  if (typeof data === "string") return data;

  if (!data || typeof data !== "object") {
    return "Your request was completed.";
  }

  return (
    data.answer ??
    data.response ??
    data.reply ??
    data.message ??
    data.result ??
    data.text ??
    data.content ??
    ""
  );
}

function getQuizQuestions(data) {
  if (Array.isArray(data)) return data;

  return (
    data?.questions ??
    data?.quiz?.questions ??
    data?.data?.questions ??
    []
  );
}

function getQuestionText(question) {
  return (
    question?.question ??
    question?.text ??
    question?.prompt ??
    "Question"
  );
}

function getOptions(question) {
  const options =
    question?.options ??
    question?.choices ??
    question?.answers ??
    [];

  if (Array.isArray(options)) {
    return options.map((option, index) => ({
      label: String.fromCharCode(65 + index),

      text:
        typeof option === "object"
          ? option.text ??
            option.label ??
            option.option ??
            JSON.stringify(option)
          : String(option),

      value:
        typeof option === "object"
          ? option.value ??
            option.text ??
            option.label ??
            option.option
          : option,
    }));
  }

  if (options && typeof options === "object") {
    return Object.entries(options).map(([key, value]) => ({
      label: key,
      text: String(value),
      value: key,
    }));
  }

  return [];
}

function getCorrectAnswer(question) {
  return (
    question?.correct_answer ??
    question?.correctAnswer ??
    question?.answer ??
    question?.correct_option ??
    question?.correctOption ??
    null
  );
}

function answerMatches(selected, correct, options) {
  if (correct === null || correct === undefined) {
    return false;
  }

  const selectedOption = options.find(
    (option) => String(option.value) === String(selected)
  );

  return [
    selected,
    selectedOption?.text,
    selectedOption?.label,
  ].some(
    (value) =>
      value !== undefined &&
      String(value).toLowerCase() === String(correct).toLowerCase()
  );
}

const FEATURES = [
  {
    id: "chat",
    icon: "🤖",
    title: "AI Study Chat",
    text: "Ask questions and understand concepts.",
    color: "violet",
  },
  {
    id: "quiz",
    icon: "📝",
    title: "Practice Quiz",
    text: "Test your knowledge with questions.",
    color: "blue",
  },
  {
    id: "planner",
    icon: "📅",
    title: "Study Planner",
    text: "Build a plan for your learning goals.",
    color: "cyan",
  },
  {
    id: "pdf",
    icon: "📚",
    title: "PDF Assistant",
    text: "Upload study material and ask questions.",
    color: "pink",
  },
];

function PageShell({ title, subtitle, icon, onBack, children }) {
  return (
    <main className="page-shell">
      <div className="page-inner">
        <button
          className="back-button"
          type="button"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span> Home
        </button>

        <header className="page-hero">
          <div className="hero-icon" aria-hidden="true">
            {icon}
          </div>

          <div>
            <p className="eyebrow">PADDIPS LEARNING SPACE</p>
            <h1>{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

function Loading({ text = "Working on it..." }) {
  return (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
    >
      <span className="spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function Notice({ type = "info", children, onClose }) {
  if (!children) return null;

  return (
    <div
      className={`notice notice-${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <span>{children}</span>

      {onClose && (
        <button
          type="button"
          className="notice-close"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState(1);
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm PADDIPS BOT. Ask me a question and let's learn together. ✨",
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);

  // Quiz state
  const [quizTopic, setQuizTopic] = useState("");
  const [quizCount, setQuizCount] = useState("5");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizNotice, setQuizNotice] = useState("");

  // Study planner state
  const [planTopic, setPlanTopic] = useState("");
  const [planDays, setPlanDays] = useState("7");
  const [studyPlan, setStudyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // PDF state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [pdfQuestion, setPdfQuestion] = useState("");
  const [pdfAnswer, setPdfAnswer] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfNotice, setPdfNotice] = useState("");
  const fileInputRef = useRef(null);
    // Splash screen timing
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 450),
      setTimeout(() => setStage(3), 950),
      setTimeout(() => setStage(4), 1450),
      setTimeout(() => setStage(5), 1950),
      setTimeout(() => setStage(6), 2600),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Automatically scroll to the latest chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, chatLoading]);

  // Close mobile navigation with the Escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function navigate(nextPage) {
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Splash screen
  const splashStages = [
    "PADDIPS",
    "PADDIPS BOT",
    "Your learning companion",
    "Chat • Quiz • Plan",
    "Preparing your workspace",
  ];

  if (stage < 6) {
    return (
      <div className="splash-screen">
        <div className="splash-orb splash-orb-one" />
        <div className="splash-orb splash-orb-two" />

        <div className="splash-content" aria-live="polite">
          <div className="splash-logo" aria-hidden="true">
            ✦
          </div>

          <p className="splash-kicker">
            AI LEARNING ASSISTANT
          </p>

          <h1 className="splash-title">
            PADDIPS BOT
          </h1>

          <p className="splash-message">
            {splashStages[Math.min(stage - 1, splashStages.length - 1)]}
          </p>

          <div className="splash-progress" aria-label="Loading">
            <span />
          </div>
        </div>
      </div>
    );
  }

  const activeFeature = FEATURES.find(
    (feature) => feature.id === page
  );

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* Navigation bar */}
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => navigate("home")}
          aria-label="PADDIPS BOT home"
        >
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>

          <span>
            PADDIPS <strong>BOT</strong>
          </span>
        </button>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close ✕" : "Menu ☰"}
        </button>

        <nav
          className={`navigation ${
            menuOpen ? "navigation-open" : ""
          }`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          <button
            className={
              page === "home" ? "nav-link active" : "nav-link"
            }
            onClick={() => navigate("home")}
          >
            Home
          </button>

          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              className={
                page === feature.id
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => navigate(feature.id)}
            >
              {feature.title}
            </button>
          ))}
        </nav>
      </header>

      {/* Main page content */}
      <main
        id="main-content"
        className="main-content"
        tabIndex="-1"
      >
        {page === "home" && (
          <section className="home-page">
            {/* Welcome section */}
            <div className="welcome-hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span className="status-dot" />
                  YOUR PERSONAL LEARNING SPACE
                </p>

                <h1>
                  Learn better.
                  <br />
                  <span>One step at a time.</span>
                </h1>

                <p className="hero-description">
                  Ask questions, practice with quizzes, plan
                  your study time, and learn from your PDF
                  materials — all in one place.
                </p>

                <button
                  className="primary-button hero-button"
                  onClick={() => navigate("chat")}
                >
                  Start learning{" "}
                  <span aria-hidden="true">→</span>
                </button>

                <p className="small-note">
                  Simple tools. Clear steps. Better learning.
                </p>
              </div>

              {/* Decorative illustration */}
              <div className="hero-art" aria-hidden="true">
                <div className="art-glow" />

                <div className="art-card art-card-main">
                  <span className="art-sparkle">✦</span>
                  <span className="art-robot">🤖</span>

                  <strong>Let's learn!</strong>

                  <small>Your AI study companion</small>

                  <div className="art-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="floating-chip chip-top">
                  ✧ Stay curious
                </div>

                <div className="floating-chip chip-bottom">
                  ✓ Keep progressing
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <section
              className="features-section"
              aria-labelledby="features-title"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    YOUR LEARNING TOOLKIT
                  </p>

                  <h2 id="features-title">
                    What would you like to do?
                  </h2>
                </div>

                <p>Choose a tool to get started.</p>
              </div>

              <div className="feature-grid">
                {FEATURES.map((feature) => (
                  <button
                    className={`feature-card feature-${feature.color}`}
                    key={feature.id}
                    onClick={() => navigate(feature.id)}
                  >
                    <span
                      className="feature-icon"
                      aria-hidden="true"
                    >
                      {feature.icon}
                    </span>

                    <span className="feature-title">
                      {feature.title}
                    </span>

                    <span className="feature-text">
                      {feature.text}
                    </span>

                    <span className="feature-action">
                      Open tool{" "}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </section>
        )}

            {/* AI STUDY CHAT */}
        {page === "chat" && (
          <PageShell
            title="AI Study Chat"
            subtitle="Ask questions and learn at your own pace."
            icon="🤖"
            onBack={() => navigate("home")}
          >
            <section className="panel chat-panel">
              <div className="chat-toolbar">
                <div>
                  <span className="status-dot" /> Assistant ready
                  <p className="muted">
                    Ask one question at a time for a clear answer.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setMessages([
                      {
                        role: "assistant",
                        content:
                          "Hi! I'm PADDIPS BOT. What would you like to learn today? ✨",
                      },
                    ]);
                    setChatError("");
                  }}
                >
                  New chat
                </button>
              </div>

              <div
                className="chat-messages"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((message, index) => (
                  <div
                    className={`chat-row ${
                      message.role === "user" ? "chat-row-user" : ""
                    }`}
                    key={`${index}-${message.role}`}
                  >
                    {message.role !== "user" && (
                      <span className="message-avatar" aria-hidden="true">
                        ✦
                      </span>
                    )}

                    <div
                      className={`chat-bubble ${
                        message.role === "user"
                          ? "user-bubble"
                          : "bot-bubble"
                      }`}
                    >
                      <span className="message-author">
                        {message.role === "user" ? "You" : "PADDIPS BOT"}
                      </span>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <Loading text="Preparing your answer..." />
                )}

                <div ref={chatEndRef} />
              </div>

              <Notice type="error">{chatError}</Notice>

              <div className="suggestions" aria-label="Suggested questions">
                <button
                  type="button"
                  onClick={() =>
                    sendMessage("Explain Python in simple words")
                  }
                >
                  Explain Python
                </button>

                <button
                  type="button"
                  onClick={() => sendMessage("What is DBMS?")}
                >
                  What is DBMS?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    sendMessage("Teach me JavaScript basics")
                  }
                >
                  JavaScript basics
                </button>
              </div>

              <form
                className="chat-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <label className="sr-only" htmlFor="chat-input">
                  Your message
                </label>

                <textarea
                  id="chat-input"
                  className="text-input chat-textarea"
                  placeholder="Type your question here..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  rows={2}
                  maxLength={4000}
                  disabled={chatLoading}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  className="primary-button send-button"
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  {chatLoading ? "Sending..." : "Send ↑"}
                </button>
              </form>

              <p className="input-hint">
                Press Enter to send · Shift + Enter for a new line
              </p>
            </section>
          </PageShell>
        )}

        {/* PRACTICE QUIZ */}
        {page === "quiz" && (
          <PageShell
            title="Practice Quiz"
            subtitle="Practice a topic and review your answers."
            icon="📝"
            onBack={() => navigate("home")}
          >
            <section className="panel">
              {!quizQuestions.length && (
                <form className="form-stack" onSubmit={generateQuiz}>
                  <div className="field">
                    <label htmlFor="quiz-topic">
                      What topic do you want to practice?
                    </label>

                    <input
                      id="quiz-topic"
                      className="text-input"
                      value={quizTopic}
                      onChange={(event) => setQuizTopic(event.target.value)}
                      placeholder="e.g. Python, DBMS, Cloud Computing"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="quiz-count">
                      Number of questions
                    </label>

                    <select
                      id="quiz-count"
                      className="text-input"
                      value={quizCount}
                      onChange={(event) => setQuizCount(event.target.value)}
                    >
                      <option value="5">5 questions</option>
                      <option value="10">10 questions</option>
                      <option value="15">15 questions</option>
                    </select>
                  </div>

                  <Notice type="error">{quizError}</Notice>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={quizLoading}
                  >
                    {quizLoading ? "Creating quiz..." : "Generate quiz →"}
                  </button>

                  {quizLoading && (
                    <Loading text="Preparing your questions..." />
                  )}
                </form>
              )}

              {quizQuestions.length > 0 && (
                <form className="form-stack" onSubmit={submitQuiz}>
                  <div className="result-banner">
                    <p className="eyebrow">YOUR QUIZ</p>
                    <h2>{quizTopic}</h2>
                    <p className="muted">
                      {quizQuestions.length} questions · Take your time
                    </p>
                  </div>

                  <Notice type="info">{quizNotice}</Notice>

                  {quizQuestions.map((question, index) => {
                    const options = getOptions(question);
                    const correct = getCorrectAnswer(question);

                    return (
                      <fieldset
                        className="question-card"
                        key={index}
                        disabled={quizSubmitted}
                      >
                        <legend>
                          {index + 1}. {getQuestionText(question)}
                        </legend>

                        <div className="option-list">
                          {options.map((option) => {
                            const selected =
                              String(quizAnswers[index]) ===
                              String(option.value);

                            const isCorrect =
                              quizSubmitted &&
                              correct !== null &&
                              answerMatches(
                                option.value,
                                correct,
                                options
                              );

                            const isWrong =
                              quizSubmitted && selected && !isCorrect;

                            return (
                              <label
                                className={`quiz-option ${
                                  selected ? "selected" : ""
                                } ${isCorrect ? "correct" : ""} ${
                                  isWrong ? "incorrect" : ""
                                }`}
                                key={`${index}-${option.label}-${option.text}`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value={String(option.value)}
                                  checked={selected}
                                  onChange={() =>
                                    setQuizAnswers((current) => ({
                                      ...current,
                                      [index]: option.value,
                                    }))
                                  }
                                />

                                <span className="option-letter">
                                  {option.label}
                                </span>

                                <span>{option.text}</span>
                              </label>
                            );
                          })}
                        </div>

                        {quizSubmitted && correct !== null && (
                          <p className="answer-feedback">
                            Correct answer: {String(correct)}
                          </p>
                        )}
                      </fieldset>
                    );
                  })}

                  {quizSubmitted ? (
                    <div className="score-card" role="status">
                      <span className="score-icon" aria-hidden="true">
                        🎉
                      </span>

                      <h2>Quiz complete!</h2>

                      <p>
                        Your score:{" "}
                        <strong>
                          {quizScore} / {quizQuestions.length}
                        </strong>
                      </p>

                      <button
                        className="primary-button"
                        type="button"
                        onClick={resetQuiz}
                      >
                        Try another quiz
                      </button>
                    </div>
                  ) : (
                    <button className="primary-button" type="submit">
                      Submit answers
                    </button>
                  )}
                </form>
              )}
            </section>
          </PageShell>
        )}

        {/* STUDY PLANNER */}
        {page === "planner" && (
          <PageShell
            title="Study Planner"
            subtitle="Build a learning schedule around your goals."
            icon="📅"
            onBack={() => navigate("home")}
          >
            <section className="panel">
              <form className="form-stack" onSubmit={generatePlan}>
                <div className="field">
                  <label htmlFor="plan-topic">
                    What do you want to learn?
                  </label>

                  <input
                    id="plan-topic"
                    className="text-input"
                    value={planTopic}
                    onChange={(event) => setPlanTopic(event.target.value)}
                    placeholder="e.g. Cloud Computing, Java, GATE CS"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="plan-days">
                    How many days do you have?
                  </label>

                  <select
                    id="plan-days"
                    className="text-input"
                    value={planDays}
                    onChange={(event) => setPlanDays(event.target.value)}
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
                  </select>

                  <p className="field-hint">
                    Choose between 1 and 60 days.
                  </p>
                </div>

                <Notice type="error">{planError}</Notice>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={planLoading}
                >
                  {planLoading
                    ? "Building your plan..."
                    : "Create my study plan →"}
                </button>

                {planLoading && (
                  <Loading text="Organizing your schedule..." />
                )}
              </form>

              {studyPlan && (
                <section
                  className="generated-result"
                  aria-labelledby="plan-result-title"
                >
                  <div className="result-banner">
                    <p className="eyebrow">YOUR PERSONAL PLAN</p>
                    <h2 id="plan-result-title">{planTopic}</h2>
                  </div>

                  <div className="result-content">
                    {typeof studyPlan === "string" ? (
                      <p className="preserve-lines">{studyPlan}</p>
                    ) : (
                      <pre className="result-pre">
                        {JSON.stringify(studyPlan, null, 2)}
                      </pre>
                    )}
                  </div>
                </section>
              )}
            </section>
          </PageShell>
        )}
        
        {/* PDF STUDY ASSISTANT */}
        {page === "pdf" && (
          <PageShell
            title="PDF Study Assistant"
            subtitle="Upload your study material and ask questions about it."
            icon="📚"
            onBack={() => navigate("home")}
          >
            <section className="panel">
              <form className="form-stack" onSubmit={uploadPdf}>
                <div className="upload-zone">
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>

                  <h2>Choose your PDF</h2>

                  <p className="muted">
                    PDF format only · Maximum file size 10 MB
                  </p>

                  <input
                    ref={fileInputRef}
                    id="pdf-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="file-input"
                    onChange={choosePdf}
                    aria-describedby="pdf-file-help"
                  />

                  <label
                    htmlFor="pdf-file"
                    className="secondary-button file-picker"
                  >
                    Browse files
                  </label>

                  <p id="pdf-file-help" className="field-hint">
                    {pdfFile
                      ? `Selected: ${pdfFile.name} (${(
                          pdfFile.size /
                          1024 /
                          1024
                        ).toFixed(2)} MB)`
                      : "No file selected yet."}
                  </p>
                </div>

                <Notice type="error">{pdfError}</Notice>
                <Notice type="success">{pdfNotice}</Notice>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={pdfLoading || !pdfFile}
                >
                  {pdfLoading ? "Uploading..." : "Upload PDF"}
                </button>

                {pdfLoading && (
                  <Loading text="Processing your document..." />
                )}
              </form>

              {pdfUploaded && (
                <form
                  className="form-stack pdf-question-form"
                  onSubmit={askAboutPdf}
                >
                  <div className="field">
                    <label htmlFor="pdf-question">
                      Ask a question about your material
                    </label>

                    <textarea
                      id="pdf-question"
                      className="text-input"
                      rows={3}
                      value={pdfQuestion}
                      onChange={(event) =>
                        setPdfQuestion(event.target.value)
                      }
                      placeholder="e.g. Summarize chapter one in simple words."
                      maxLength={2000}
                      required
                    />
                  </div>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={pdfLoading || !pdfQuestion.trim()}
                  >
                    {pdfLoading
                      ? "Finding an answer..."
                      : "Ask about this PDF →"}
                  </button>
                </form>
              )}

              {pdfAnswer && (
                <section
                  className="answer-card"
                  aria-labelledby="pdf-answer-title"
                  aria-live="polite"
                >
                  <p className="eyebrow">YOUR ANSWER</p>

                  <h2 id="pdf-answer-title">
                    Let's understand it
                  </h2>

                  <p className="preserve-lines">{pdfAnswer}</p>
                </section>
              )}
            </section>
          </PageShell>
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <button
          className="footer-brand"
          type="button"
          onClick={() => navigate("home")}
        >
          ✦ PADDIPS BOT
        </button>

        <p>Keep learning. Keep growing. ✨</p>

        <p className="footer-small">
          AI can make mistakes. Verify important information with trusted sources.
        </p>
      </footer>
    </div>
  );
                  }
                    
