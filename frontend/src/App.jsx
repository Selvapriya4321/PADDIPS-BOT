import { useEffect, useState } from "react";
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
      "Cannot connect to the backend. Check your internet connection and Render URL."
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The backend returned an invalid response. Please try again.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
        data.message ||
        data.reply ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

function getOptionText(option) {
  if (typeof option === "string") return option;
  return String(option?.text ?? option?.label ?? option?.value ?? "");
}

function getCorrectAnswer(question) {
  const answer = question.answer ?? question.correctAnswer;
  const options = question.options || [];

  if (typeof answer === "number") {
    return getOptionText(options[answer] ?? "");
  }

  if (typeof answer !== "string") return "";

  const match = answer.match(/^([A-D])(?:[\s).:-]|$)/i);
  if (match && options.length) {
    const index = match[1].toUpperCase().charCodeAt(0) - 65;
    if (options[index] !== undefined) return getOptionText(options[index]);
  }

  return answer;
}

export default function App() {
  const [stage, setStage] = useState(1);
  const [page, setPage] = useState("home");

  // Chat
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 Welcome to PADDIPS BOT. Ask me anything you want to learn!",
    },
  ]);
  const [message, setMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Quiz
  const [topic, setTopic] = useState("");
  const [quizCount, setQuizCount] = useState("5");
  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Study plan
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState("7");
  const [studyPlan, setStudyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // PDF study material
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfError, setPdfError] = useState("");

  // Splash animation
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 1800),
      window.setTimeout(() => setStage(4), 2700),
      window.setTimeout(() => setStage(5), 3600),
      window.setTimeout(() => setStage(6), 4500),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, []);

  function goTo(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // CHAT
  async function sendMessage(event) {
    event?.preventDefault();

    const question = message.trim();
    if (!question || chatLoading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: question },
    ]);

    setMessage("");
    setChatLoading(true);
    setChatError("");

    try {
      const data = await apiRequest("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      const reply = data.reply || data.answer;
      if (!reply) throw new Error("The backend returned an empty answer.");

      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply },
      ]);
    } catch (error) {
      setChatError(error.message || "Chat request failed.");
    } finally {
      setChatLoading(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        text: "Hello again! 👋 What would you like to learn?",
      },
    ]);
    setChatError("");
  }

  // QUIZ
  async function generateQuiz() {
    setQuizLoading(true);
    setQuizError("");
    setQuiz([]);
    setSelectedAnswers({});
    setScore(null);
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

      if (!Array.isArray(data.questions)) {
        throw new Error("The backend did not return quiz questions.");
      }

      const questions = data.questions
        .filter(
          (question) =>
            question &&
            typeof question.question === "string" &&
            Array.isArray(question.options) &&
            question.options.length === 4
        )
        .slice(0, Number(quizCount));

      if (!questions.length) {
        throw new Error("No valid questions were generated.");
      }

      setQuiz(questions);
    } catch (error) {
      setQuizError(error.message || "Quiz generation failed.");
    } finally {
      setQuizLoading(false);
    }
  }

  function selectAnswer(index, answer) {
    if (quizSubmitted) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [index]: answer,
    }));
  }

  function submitQuiz() {
    if (!quiz.length || quizSubmitted) return;

    const total = quiz.reduce((correct, question, index) => {
      const answer = getCorrectAnswer(question).trim();
      const selected = String(selectedAnswers[index] ?? "").trim();

      return correct + (selected && answer === selected ? 1 : 0);
    }, 0);

    setScore(total);
    setQuizSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetQuiz() {
    setQuiz([]);
    setSelectedAnswers({});
    setScore(null);
    setQuizSubmitted(false);
    setQuizError("");
  }

  // STUDY PLAN
  async function generateStudyPlan(event) {
    event?.preventDefault();
    setPlanError("");
    setStudyPlan("");

    if (!subject.trim()) {
      setPlanError("Please enter a subject.");
      return;
    }

    const numberOfDays = Number(days);

    if (
      !Number.isInteger(numberOfDays) ||
      numberOfDays < 1 ||
      numberOfDays > 60
    ) {
      setPlanError("Enter a duration between 1 and 60 days.");
      return;
    }

    setPlanLoading(true);

    try {
      const data = await apiRequest("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          days: numberOfDays,
        }),
      });

      if (!data.plan) {
        throw new Error("The backend returned an empty study plan.");
      }

      setStudyPlan(
        typeof data.plan === "string"
          ? data.plan
          : JSON.stringify(data.plan, null, 2)
      );
    } catch (error) {
      setPlanError(error.message || "Study plan generation failed.");
    } finally {
      setPlanLoading(false);
    }
  }

  // PDF UPLOAD
  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    setPdfError("");
    setPdfData(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setSelectedFile(null);
      setPdfError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setPdfError("PDF size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function uploadMaterial() {
    if (!selectedFile) {
      setPdfError("Please choose a PDF file first.");
      return;
    }

    setUploadLoading(true);
    setPdfError("");
    setPdfData(null);

    try {
      const formData = new FormData();
      formData.append("material", selectedFile);

      const data = await apiRequest("/api/upload-material", {
        method: "POST",
        body: formData,
      });

      setPdfData({
        filename: data.filename || selectedFile.name,
        pages: data.pages ?? "N/A",
        text: data.text || "",
      });
    } catch (error) {
      setPdfError(error.message || "PDF upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }

  function askAboutPDF() {
    if (!pdfData?.text) return;

    const prompt =
      "Explain this uploaded study material in simple English. Give a summary, important points, and examples:\n\n" +
      pdfData.text.slice(0, 10000);

    goTo("chat");
    setMessage(prompt);
  }

  // REUSABLE PAGE LAYOUT
  function PageShell({ icon, title, description, children }) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <button className="back-button" onClick={() => goTo("home")}>
            ← Back to Home
          </button>

          <header className="page-hero">
            <div className="hero-icon">{icon}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          {children}
        </div>
      </div>
    );
      }
    // SPLASH SCREEN
  if (stage < 6) {
    return (
      <div className="splash">
        <div className="stars">
          {Array.from({ length: 65 }, (_, index) => (
            <span
              key={index}
              className="star"
              style={{
                left: `${(index * 37 + 11) % 100}%`,
                top: `${(index * 53 + 7) % 100}%`,
                animationDelay: `${(index % 10) * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="background-glow" />
        <div className="orb orb1" />
        <div className="orb orb2" />

        {stage < 3 && (
          <>
            <div className="splash-robot">
              <img
                src={`${import.meta.env.BASE_URL}bot.png`}
                alt="PADDIPS robot"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="splash-brand">
              <img
                src={`${import.meta.env.BASE_URL}paddips.png`}
                alt="PADDIPS"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <h2>PADDIPS BOT</h2>
            </div>
          </>
        )}

        {stage >= 3 && stage < 5 && (
          <div className="energy">
            <div className="energy-core" />
            <div className="energy-text">ACTIVATING AI...</div>
          </div>
        )}

        {stage >= 5 && (
          <div className="final-logo">
            <img
              src={`${import.meta.env.BASE_URL}paddips-bot.png`}
              alt="PADDIPS BOT"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="final-emoji">🤖</div>
            <h2>PADDIPS BOT</h2>
            <p>AI LEARNING ASSISTANT</p>
            <span>✦ INTELLIGENT • FAST • SMART ✦</span>
          </div>
        )}

        <div className="status">
          {stage === 1 && "INITIALIZING..."}
          {stage === 2 && "CONNECTING..."}
          {stage === 3 && "SYNCHRONIZING..."}
          {stage === 4 && "ACTIVATING AI..."}
          {stage === 5 && "PADDIPS BOT READY"}
        </div>

        <style>{`
          .splash {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            color: white;
            background: radial-gradient(circle at center, #5b21b6, #17134d 52%, #02020d);
            font-family: Arial, sans-serif;
          }
          .stars { position: absolute; inset: 0; }
          .star {
            position: absolute;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 10px white;
            animation: blink 2s infinite;
          }
          @keyframes blink {
            0%, 100% { opacity: .2; }
            50% { opacity: 1; }
          }
          .background-glow {
            position: absolute;
            width: 65vw;
            height: 65vw;
            border-radius: 50%;
            background: radial-gradient(circle, #a78bfa66, transparent 70%);
            animation: glow 3s infinite alternate;
          }
          @keyframes glow {
            to { transform: scale(1.3); opacity: .5; }
          }
          .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(8px);
            opacity: .5;
            animation: float 4s infinite alternate;
          }
          .orb1 {
            width: 140px;
            height: 140px;
            left: 8%;
            top: 15%;
            background: #7c3aed;
          }
          .orb2 {
            width: 180px;
            height: 180px;
            right: 8%;
            bottom: 12%;
            background: #4f46e5;
          }
          @keyframes float {
            to { transform: translateY(-30px) scale(1.1); }
          }
          .splash-robot, .splash-brand {
            position: absolute;
            top: 50%;
            width: 260px;
            text-align: center;
            transform: translateY(-50%);
          }
          .splash-robot {
            left: 8%;
            animation: enterLeft 1.2s;
          }
          .splash-brand {
            right: 8%;
            animation: enterRight 1.2s;
          }
          .splash-robot img, .splash-brand img {
            display: block;
            width: 200px;
            height: 180px;
            object-fit: contain;
            margin: auto;
            filter: drop-shadow(0 0 22px #a78bfa);
          }
          .splash-brand h2 {
            font-size: 25px;
            letter-spacing: 4px;
          }
          @keyframes enterLeft {
            from { left: -300px; }
            to { left: 8%; }
          }
          @keyframes enterRight {
            from { right: -300px; }
            to { right: 8%; }
          }
          .energy {
            position: absolute;
            top: 50%;
            left: 15%;
            right: 15%;
            height: 5px;
            background: linear-gradient(90deg, transparent, #8b5cf6, white, #a78bfa, transparent);
            box-shadow: 0 0 30px #8b5cf6;
            animation: energyPulse .4s infinite alternate;
          }
          .energy-core {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: radial-gradient(circle, white, #a78bfa, transparent);
            transform: translate(-50%, -50%);
            animation: corePulse .5s infinite alternate;
          }
          .energy-text {
            position: absolute;
            top: 65px;
            width: 100%;
            text-align: center;
            font-size: 12px;
            letter-spacing: 3px;
          }
          @keyframes energyPulse { to { opacity: .4; } }
          @keyframes corePulse {
            to { transform: translate(-50%, -50%) scale(1.5); }
          }
          .final-logo {
            position: absolute;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            animation: appear 1s ease-out;
          }
          .final-logo img {
            width: 210px;
            height: 180px;
            object-fit: contain;
            filter: drop-shadow(0 0 25px #8b5cf6);
          }
          .final-logo h2 { letter-spacing: 5px; margin: 10px 0; }
          .final-logo p {
            letter-spacing: 4px;
            font-size: 12px;
            color: #ddd6fe;
          }
          .final-logo span {
            letter-spacing: 2px;
            font-size: 10px;
            color: #c4b5fd;
          }
          @keyframes appear {
            from { opacity: 0; transform: scale(.4); }
            to { opacity: 1; transform: scale(1); }
          }
          .status {
            position: absolute;
            bottom: 45px;
            z-index: 100;
            color: #ddd6fe;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 4px;
            animation: blink 1s infinite;
          }
          @media (max-width: 650px) {
            .splash-robot, .splash-brand { width: 150px; }
            .splash-robot img, .splash-brand img {
              width: 125px;
              height: 115px;
            }
            .splash-brand h2 {
              font-size: 14px;
              letter-spacing: 2px;
            }
            .final-logo img {
              width: 150px;
              height: 130px;
            }
            .status {
              bottom: 25px;
              letter-spacing: 2px;
              font-size: 10px;
            }
          }
        `}</style>
      </div>
    );
  }

  // CHAT PAGE
  if (page === "chat") {
    return (
      <PageShell
        icon="🤖"
        title="AI Study Chat"
        description="Ask questions and learn with PADDIPS BOT. Your personal learning companion."
      >
        <section className="panel chat-panel">
          <div className="chat-toolbar">
            <div>
              <strong>🤖 PADDIPS BOT</strong>
              <p className="muted">AI Assistant</p>
            </div>
            <button className="secondary" onClick={clearChat}>
              Clear Chat
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`chat-bubble ${
                  item.role === "user" ? "user-bubble" : "bot-bubble"
                }`}
              >
                <strong>
                  {item.role === "user" ? "👤 You" : "🤖 PADDIPS BOT"}
                </strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              </div>
            ))}

            {chatLoading && (
              <div className="chat-bubble bot-bubble">
                ✨ PADDIPS BOT is thinking...
              </div>
            )}
          </div>

          {chatError && <p className="error">{chatError}</p>}

          <form className="chat-form" onSubmit={sendMessage}>
            <input
              className="text-input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask anything about your studies..."
              maxLength={10000}
              disabled={chatLoading}
            />
            <button
              className="primary"
              type="submit"
              disabled={chatLoading || !message.trim()}
            >
              {chatLoading ? "Thinking..." : "Send ➤"}
            </button>
          </form>

          <div className="suggestions">
            {["Explain Python", "What is DBMS?", "Teach me JavaScript"].map(
              (prompt) => (
                <button
                  key={prompt}
                  className="suggestion"
                  onClick={() => setMessage(prompt)}
                >
                  {prompt}
                </button>
              )
            )}
          </div>
        </section>
      </PageShell>
    );
                      }
    // QUIZ PAGE
  if (page === "quiz") {
    return (
      <PageShell
        icon="📝"
        title="AI Quiz Generator"
        description="Create a practice quiz and check your answers."
      >
        <section className="panel">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              generateQuiz();
            }}
          >
            <label htmlFor="quiz-topic">Topic</label>
            <input
              id="quiz-topic"
              className="text-input"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Example: Python, DBMS, Cloud Computing"
            />

            <label htmlFor="quiz-count">Number of questions</label>
            <select
              id="quiz-count"
              className="text-input"
              value={quizCount}
              onChange={(event) => setQuizCount(event.target.value)}
            >
              {[5, 10, 15, 20].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>

            <button className="primary" type="submit" disabled={quizLoading}>
              {quizLoading ? "Generating quiz..." : "Generate Quiz"}
            </button>
          </form>

          {quizError && <p className="error">{quizError}</p>}

          {quizSubmitted && score !== null && (
            <div className="result-box">
              <h3>Your Score: {score} / {quiz.length}</h3>
              <p>{Math.round((score / quiz.length) * 100)}% correct</p>
            </div>
          )}

          {quiz.map((question, index) => (
            <article
              className="question-card"
              key={`${index}-${question.question}`}
            >
              <h3>{index + 1}. {question.question}</h3>

              <div className="option-list">
                {question.options.map((option, optionIndex) => {
                  const optionText = getOptionText(option);
                  const correct =
                    getCorrectAnswer(question).trim() === optionText.trim();
                  const selected = selectedAnswers[index] === optionText;

                  let className = "quiz-option";
                  if (selected) className += " selected";
                  if (quizSubmitted && correct) className += " correct";
                  if (quizSubmitted && selected && !correct) {
                    className += " incorrect";
                  }

                  return (
                    <button
                      type="button"
                      key={`${optionIndex}-${optionText}`}
                      className={className}
                      onClick={() => selectAnswer(index, optionText)}
                      disabled={quizSubmitted}
                    >
                      {String.fromCharCode(65 + optionIndex)}. {optionText}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <p className="answer-note">
                  Correct answer: <strong>{getCorrectAnswer(question)}</strong>
                </p>
              )}
            </article>
          ))}

          {quiz.length > 0 && !quizSubmitted && (
            <button className="primary" onClick={submitQuiz}>
              Submit Answers
            </button>
          )}

          {quiz.length > 0 && quizSubmitted && (
            <button className="secondary" onClick={resetQuiz}>
              Create Another Quiz
            </button>
          )}
        </section>
      </PageShell>
    );
  }

  // STUDY PLAN PAGE
  if (page === "plan") {
    return (
      <PageShell
        icon="📅"
        title="AI Study Planner"
        description="Create a step-by-step study plan for your learning goal."
      >
        <section className="panel">
          <form className="form-stack" onSubmit={generateStudyPlan}>
            <label htmlFor="subject">Subject or skill</label>
            <input
              id="subject"
              className="text-input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Example: Cloud Computing, Java, GATE CSE"
              maxLength={200}
            />

            <label htmlFor="days">Duration (1–60 days)</label>
            <input
              id="days"
              className="text-input"
              type="number"
              min="1"
              max="60"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />

            <button className="primary" type="submit" disabled={planLoading}>
              {planLoading ? "Creating your plan..." : "Generate Study Plan"}
            </button>
          </form>

          {planError && <p className="error">{planError}</p>}

          {studyPlan && (
            <div className="plan-result">
              <h2>Your Study Plan</h2>
              <pre style={{ whiteSpace: "pre-wrap" }}>{studyPlan}</pre>
              <button
                className="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(studyPlan);
                }}
              >
                Copy Study Plan
              </button>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // PDF MATERIAL PAGE
  if (page === "material") {
    return (
      <PageShell
        icon="📚"
        title="Study Material"
        description="Upload PDF notes, syllabus or textbook and extract its text."
      >
        <section className="panel">
          <h2>📄 Upload PDF</h2>
          <p>Choose a PDF file up to 10 MB.</p>

          <input
            className="text-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileSelect}
          />

          {selectedFile && (
            <p className="muted">
              Selected: {selectedFile.name} (
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}

          <button
            className="primary"
            onClick={uploadMaterial}
            disabled={uploadLoading || !selectedFile}
          >
            {uploadLoading ? "Uploading and reading PDF..." : "Upload and Read PDF"}
          </button>

          {pdfError && <p className="error">{pdfError}</p>}

          {pdfData && (
            <div className="pdf-result">
              <h3>✅ PDF processed successfully</h3>
              <p><strong>File:</strong> {pdfData.filename}</p>
              <p><strong>Pages:</strong> {pdfData.pages}</p>

              <button
                className="primary"
                onClick={askAboutPDF}
                disabled={!pdfData.text}
              >
                Ask PADDIPS BOT to Explain This PDF
              </button>

              <h3>Extracted text preview</h3>
              <pre className="pdf-text">{pdfData.text.slice(0, 12000)}</pre>

              {pdfData.text.length > 12000 && (
                <p className="muted">
                  Preview limited to the first 12,000 characters.
                </p>
              )}
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // HOME PAGE
  return (
    <main className="home-page">
      <header className="home-hero">
        <div className="home-robot">🤖</div>
        <p className="eyebrow">YOUR PERSONAL AI LEARNING COMPANION</p>
        <h1>PADDIPS BOT</h1>
        <h2>AI Learning Assistant</h2>
        <p>
          Learn smarter with AI chat, practice quizzes, study plans, and PDF notes.
        </p>
      </header>

      <section className="feature-grid">
        <button className="feature-card" onClick={() => goTo("chat")}>
          <span className="feature-icon">💬</span>
          <h3>AI Study Chat</h3>
          <p>Ask questions and get clear explanations.</p>
          <span className="feature-link">Start learning →</span>
        </button>

        <button className="feature-card" onClick={() => goTo("quiz")}>
          <span className="feature-icon">📝</span>
          <h3>AI Quiz Generator</h3>
          <p>Generate multiple-choice questions and check your score.</p>
          <span className="feature-link">Practice now →</span>
        </button>

        <button className="feature-card" onClick={() => goTo("plan")}>
          <span className="feature-icon">📅</span>
          <h3>Study Planner</h3>
          <p>Build a day-by-day learning schedule.</p>
          <span className="feature-link">Plan learning →</span>
        </button>

        <button className="feature-card" onClick={() => goTo("material")}>
          <span className="feature-icon">📚</span>
          <h3>Study Material</h3>
          <p>Upload a PDF and extract readable text.</p>
          <span className="feature-link">Upload PDF →</span>
        </button>
      </section>

      <footer className="home-footer">
        <p>🤖 PADDIPS BOT · AI LEARNING ASSISTANT</p>
      </footer>
    </main>
  );
      }
