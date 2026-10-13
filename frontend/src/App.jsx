
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://paddips-bot.onrender.com";


async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

function App() {
  // Intro animation
  const [stage, setStage] = useState(1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 2600),
      setTimeout(() => setStage(4), 3900),
      setTimeout(() => setStage(5), 5000),
      setTimeout(() => setStage(6), 5900),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const [page, setPage] = useState("home");

  // Chat
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! 👋 I'm PADDIPS BOT. What would you like to learn today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Quiz
  const [topic, setTopic] = useState("");
  const [quizCount, setQuizCount] = useState(5);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Study plan
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState(7);
  const [studyPlan, setStudyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // PDF
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // Send message to backend
  async function sendMessage(event) {
    event?.preventDefault();

    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatError("");
    setChatInput("");
    setMessages((old) => [...old, { role: "user", content: message }]);
    setChatLoading(true);

    try {
      const data = await apiRequest("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const reply =
        data.reply ??
        data.response ??
        data.answer ??
        data.message;

      if (typeof reply !== "string") {
        throw new Error(
          "The backend did not return a text reply. Check its /api/chat response format."
        );
      }

      setMessages((old) => [
        ...old,
        { role: "assistant", content: reply },
      ]);
    } catch (error) {
      setChatError(error.message || "Could not connect to the chatbot.");
    } finally {
      setChatLoading(false);
    }
  }

  // Generate quiz
  async function generateQuiz(event) {
    event?.preventDefault();

    setQuizLoading(true);
    setQuizError("");
    setQuiz([]);
    setAnswers({});
    setQuizSubmitted(false);

    try {
      const data = await apiRequest("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || "Computer Science",
          count: Number(quizCount),
        }),
      });

      const questions = data.questions ?? data.quiz;

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("No quiz questions were returned by the backend.");
      }

      setQuiz(questions.slice(0, Number(quizCount)));
    } catch (error) {
      setQuizError(error.message || "Quiz generation failed.");
    } finally {
      setQuizLoading(false);
    }
  }

  function getOptions(question) {
    if (Array.isArray(question.options)) return question.options;

    if (question.options && typeof question.options === "object") {
      return Object.entries(question.options).map(
        ([key, value]) => `${key}. ${value}`
      );
    }

    return [
      question.optionA ?? question.A,
      question.optionB ?? question.B,
      question.optionC ?? question.C,
      question.optionD ?? question.D,
    ].filter(Boolean);
  }

  function getCorrectAnswer(question) {
    return question.answer ?? question.correctAnswer ?? question.correct_answer;
  }

  function submitQuiz() {
    setQuizSubmitted(true);
  }

  function resetQuiz() {
    setQuiz([]);
    setAnswers({});
    setQuizSubmitted(false);
    setQuizError("");
  }

  const score = quiz.reduce((total, question, index) => {
    const correct = getCorrectAnswer(question);
    const selected = answers[index];

    if (correct == null || selected == null) return total;

    const options = getOptions(question);
    const selectedText = options[selected];
    const correctText = String(correct).trim();

    const matches =
      String(selected).trim().toLowerCase() === correctText.toLowerCase() ||
      String(selectedText ?? "").trim().toLowerCase() === correctText.toLowerCase() ||
      String(selectedText ?? "").trim().toLowerCase().startsWith(
        `${correctText.toLowerCase()}.`
      );

    return total + (matches ? 1 : 0);
  }, 0);

  // Generate study plan
  async function generateStudyPlan(event) {
    event?.preventDefault();

    if (!subject.trim()) {
      setPlanError("Please enter a subject.");
      return;
    }

    setPlanLoading(true);
    setPlanError("");
    setStudyPlan("");

    try {
      const data = await apiRequest("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          days: Number(days),
        }),
      });

      const plan = data.plan ?? data.studyPlan ?? data.response;

      if (typeof plan !== "string") {
        throw new Error("The backend did not return a study plan in the expected format.");
      }

      setStudyPlan(plan);
    } catch (error) {
      setPlanError(error.message || "Study plan generation failed.");
    } finally {
      setPlanLoading(false);
    }
  }

  // Select PDF
  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    setSelectedFile(null);
    setPdfData(null);
    setPdfError("");

    if (!file) return;

    if (file.type !== "application/pdf") {
      setPdfError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPdfError("The PDF must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  // Upload PDF to backend
  async function uploadMaterial(event) {
    event?.preventDefault();

    if (!selectedFile) {
      setPdfError("Choose a PDF file first.");
      return;
    }

    setPdfLoading(true);
    setPdfError("");
    setPdfData(null);

    try {
      const formData = new FormData();
      formData.append("material", selectedFile);

      const data = await apiRequest("/api/upload-material", {
        method: "POST",
        body: formData,
      });

      setPdfData(data);
    } catch (error) {
      setPdfError(error.message || "PDF upload failed.");
    } finally {
      setPdfLoading(false);
    }
  }

  // Intro screen
  if (stage < 6) {
    return (
      <main className="splash-screen">
        <div className="splash-stars" aria-hidden="true">
          {Array.from({ length: 55 }, (_, index) => (
            <span
              key={index}
              className="splash-star"
              style={{
                left: `${(index * 37) % 100}%`,
                top: `${(index * 53) % 100}%`,
                animationDelay: `${(index % 8) * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="splash-glow" />

        <div className={`splash-logo ${stage >= 3 ? "logo-joined" : ""} ${stage >= 4 ? "logo-blast" : ""}`}>
          <img src={`${import.meta.env.BASE_URL}paddips.png`} alt="" />
          <img src={`${import.meta.env.BASE_URL}bot.png`} alt="" />
        </div>

        <div className="splash-title">PADDIPS BOT</div>
        <p className="splash-subtitle">AI LEARNING ASSISTANT</p>
        <div className="loading-track">
          <span />
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")} type="button">
          <span className="brand-icon">✦</span>
          <span>
            <strong>PADDIPS BOT</strong>
            <small>AI LEARNING ASSISTANT</small>
          </span>
        </button>

        <nav className="nav-links">
          <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>Home</button>
          <button className={page === "chat" ? "active" : ""} onClick={() => setPage("chat")}>AI Chat</button>
          <button className={page === "quiz" ? "active" : ""} onClick={() => setPage("quiz")}>Quiz</button>
          <button className={page === "plan" ? "active" : ""} onClick={() => setPage("plan")}>Study Plan</button>
          <button className={page === "material" ? "active" : ""} onClick={() => setPage("material")}>PDF Notes</button>
        </nav>
      </header>

      <main className="main-content">
        {page === "home" && (
          <section className="hero">
            <div className="hero-badge"><span /> YOUR PERSONAL AI STUDY PARTNER</div>
            <h1>Learn smarter.<br /><span>Achieve more.</span></h1>
            <p className="hero-description">
              Ask questions, generate quizzes, build study plans, and learn from your PDF notes — all in one place.
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={() => setPage("chat")}>Start Learning ↗</button>
              <button className="secondary-button" onClick={() => setPage("quiz")}>Create a Quiz</button>
            </div>

            <div className="feature-grid">
              <button className="feature-card" onClick={() => setPage("chat")}>
                <span className="feature-icon purple">✧</span>
                <h3>AI Study Chat</h3>
                <p>Ask questions and get clear explanations.</p>
                <span className="feature-link">Open chat ↗</span>
              </button>

              <button className="feature-card" onClick={() => setPage("quiz")}>
                <span className="feature-icon pink">◈</span>
                <h3>Smart Quiz</h3>
                <p>Practice a topic with AI-generated questions.</p>
                <span className="feature-link">Generate quiz ↗</span>
              </button>

              <button className="feature-card" onClick={() => setPage("plan")}>
                <span className="feature-icon green">▤</span>
                <h3>Study Planner</h3>
                <p>Create a plan for your learning goals.</p>
                <span className="feature-link">Build a plan ↗</span>
              </button>

              <button className="feature-card" onClick={() => setPage("material")}>
                <span className="feature-icon orange">▧</span>
                <h3>PDF Learning</h3>
                <p>Upload study material to your backend.</p>
                <span className="feature-link">Upload PDF ↗</span>
              </button>
            </div>
          </section>
        )}

        {page === "chat" && (
          <section className="workspace">
            <div className="section-heading">
              <span className="section-icon">✦</span>
              <div><h1>AI Study Chat</h1><p>Ask anything. Keep learning.</p></div>
            </div>

            <div className="chat-panel">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div className={`message-row ${message.role}`} key={index}>
                    <div className="message-avatar">{message.role === "user" ? "YOU" : "✦"}</div>
                    <div className="message-bubble">
                      <strong>{message.role === "user" ? "You" : "PADDIPS BOT"}</strong>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && <div className="typing-indicator">PADDIPS BOT is thinking…</div>}
              </div>

              {chatError && <p className="error-message">{chatError}</p>}

              <form className="chat-form" onSubmit={sendMessage}>
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask a question about your studies..."
                  aria-label="Your message"
                />
                <button className="primary-button" disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? "Sending…" : "Send ↑"}
                </button>
              </form>
              <p className="helper-text">Your API key stays on the backend, not in this frontend.</p>
            </div>
          </section>
        )}

        {page === "quiz" && (
          <section className="workspace">
            <div className="section-heading">
              <span className="section-icon pink">◈</span>
              <div><h1>Smart Quiz Generator</h1><p>Test your knowledge and track your score.</p></div>
            </div>

            <form className="tool-panel" onSubmit={generateQuiz}>
              <label>Topic
                <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. JavaScript, DBMS, Computer Networks" />
              </label>
              <label>Number of questions
                <select value={quizCount} onChange={(event) => setQuizCount(Number(event.target.value))}>
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                </select>
              </label>
              <button className="primary-button" disabled={quizLoading}>{quizLoading ? "Generating quiz…" : "Generate Quiz ✨"}</button>
              {quizError && <p className="error-message">{quizError}</p>}
            </form>

            {quiz.length > 0 && (
              <div className="quiz-results">
                {quizSubmitted && (
                  <div className="score-card">
                    <h2>Quiz completed!</h2>
                    <p>Your score: <strong>{score} / {quiz.length}</strong></p>
                    <p>Questions with missing answer keys cannot be automatically scored.</p>
                  </div>
                )}

                {quiz.map((question, index) => {
                  const options = getOptions(question);
                  const correct = getCorrectAnswer(question);

                  return (
                    <article className="question-card" key={index}>
                      <h3>{index + 1}. {question.question ?? question.text ?? `Question ${index + 1}`}</h3>
                      <div className="answer-options">
                        {options.map((option, optionIndex) => (
                          <label className={`answer-option ${answers[index] === String(optionIndex) ? "selected" : ""}`} key={optionIndex}>
                            <input
                              type="radio"
                              name={`question-${index}`}
                              value={optionIndex}
                              checked={answers[index] === String(optionIndex)}
                              disabled={quizSubmitted}
                              onChange={(event) => setAnswers((old) => ({ ...old, [index]: event.target.value }))}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                      {quizSubmitted && correct != null && (
                        <p className="correct-answer">Correct answer: {String(correct)}</p>
                      )}
                    </article>
                  );
                })}

                {!quizSubmitted ? (
                  <button className="primary-button" onClick={submitQuiz}>Submit Answers</button>
                ) : (
                  <button className="secondary-button" onClick={resetQuiz}>Try Another Quiz</button>
                )}
              </div>
            )}
          </section>
        )}

        {page === "plan" && (
          <section className="workspace">
            <div className="section-heading">
              <span className="section-icon green">▤</span>
              <div><h1>Your Study Plan</h1><p>Turn your learning goal into a daily plan.</p></div>
            </div>

            <form className="tool-panel" onSubmit={generateStudyPlan}>
              <label>What do you want to learn?
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. React, Python, Data Structures" />
              </label>
              <label>Study duration
                <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </label>
              <button className="primary-button" disabled={planLoading}>{planLoading ? "Creating plan…" : "Generate Study Plan ✨"}</button>
              {planError && <p className="error-message">{planError}</p>}
            </form>

            {studyPlan && <article className="output-panel"><h2>📚 Your learning roadmap</h2><pre>{studyPlan}</pre></article>}
          </section>
        )}

        {page === "material" && (
          <section className="workspace">
            <div className="section-heading">
              <span className="section-icon orange">▧</span>
              <div><h1>PDF Learning Materials</h1><p>Upload your study PDF to the backend.</p></div>
            </div>

            <form className="tool-panel" onSubmit={uploadMaterial}>
              <label className="upload-zone">
                <span className="upload-symbol">↑</span>
                <strong>{selectedFile ? selectedFile.name : "Choose your PDF file"}</strong>
                <span>PDF only · Maximum 10 MB</span>
                <input type="file" accept="application/pdf,.pdf" onChange={handleFileSelect} />
              </label>
              <button className="primary-button" disabled={pdfLoading || !selectedFile}>
                {pdfLoading ? "Uploading…" : "Upload Study Material"}
              </button>
              {pdfError && <p className="error-message">{pdfError}</p>}
            </form>

            {pdfData && (
              <article className="output-panel">
                <h2>Upload response</h2>
                <pre>{JSON.stringify(pdfData, null, 2)}</pre>
                <p className="helper-text">
                  This displays the backend response. PDF summarization or question answering must also be implemented by the backend to work.
                </p>
              </article>
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <span>✦ PADDIPS BOT</span>
        <span>Learn something new every day.</span>
      </footer>
    </div>
  );
}

export default App;
