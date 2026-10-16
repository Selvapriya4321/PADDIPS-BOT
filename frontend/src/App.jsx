
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://paddips-bot.onrender.com"
).replace(/\/+$/, "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(
      "Cannot connect to backend. Check your internet or backend URL."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid backend response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

function getOptionText(option) {
  if (typeof option === "string") return option;

  return String(
    option?.text ?? option?.label ?? option?.value ?? ""
  );
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
    if (options[index] !== undefined) {
      return getOptionText(options[index]);
    }
  }

  return answer;
}

function App() {
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
  const [quizCount, setQuizCount] = useState(5);
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

  // PDF
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfError, setPdfError] = useState("");

  // Splash animation
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => setStage(4), 3600),
      setTimeout(() => setStage(5), 4500),
      setTimeout(() => setStage(6), 5700),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // ---------------- CHAT ----------------

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

      if (!reply) {
        throw new Error("The backend returned an empty answer.");
      }

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

  // ---------------- QUIZ ----------------

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
          (q) =>
            q &&
            typeof q.question === "string" &&
            Array.isArray(q.options) &&
            q.options.length >= 2
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

    const total = quiz.reduce((count, question, index) => {
      const correctAnswer = getCorrectAnswer(question);
      const selected = selectedAnswers[index];

      return count + (
        selected !== undefined &&
        correctAnswer.trim() === selected.trim()
          ? 1
          : 0
      );
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

  // ---------------- STUDY PLAN ----------------

  async function generateStudyPlan() {
    setPlanError("");
    setStudyPlan("");

    if (!subject.trim()) {
      setPlanError("Please enter a subject.");
      return;
    }

    if (
      !Number.isInteger(Number(days)) ||
      Number(days) < 1 ||
      Number(days) > 365
    ) {
      setPlanError("Enter between 1 and 365 days.");
      return;
    }

    setPlanLoading(true);

    try {
      const data = await apiRequest("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          days: Number(days),
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

  // ---------------- PDF ----------------

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
      setPdfError("Please choose a PDF first.");
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

    const question =
      `Explain this study material in simple language. ` +
      `Give important points and examples:\n\n` +
      pdfData.text.slice(0, 10000);

    setMessages((previous) => [
      ...previous,
      { role: "user", text: "Explain my uploaded PDF." },
    ]);

    setMessage(question);
    setPage("chat");
  }

  // ---------------- SHARED UI ----------------

  function goTo(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  // ---------------- SPLASH SCREEN ----------------

  if (stage < 6) {
    return (
      <div className="splash">
        <div className="stars">
          {Array.from({ length: 65 }, (_, i) => (
            <span
              key={i}
              className="star"
              style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i % 10) * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="background-glow" />
        <div className="orb orb1" />
        <div className="orb orb2" />

        <div className={`splash-robot ${stage >= 3 ? "robot-center" : ""}`}>
          <img
            src={`${import.meta.env.BASE_URL}bot.png`}
            alt="PADDIPS Robot"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span>🤖</span>
        </div>

        <div className={`splash-brand ${stage >= 3 ? "brand-center" : ""}`}>
          <img
            src={`${import.meta.env.BASE_URL}paddips.png`}
            alt="PADDIPS"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h2>PADDIPS BOT</h2>
        </div>

        {stage >= 3 && (
          <div className="energy">
            <div className="energy-core" />
          </div>
        )}

        {stage === 4 && (
          <div className="explosion">
            {Array.from({ length: 32 }, (_, i) => (
              <span
                key={i}
                className="particle"
                style={{
                  "--angle": `${i * 11.25}deg`,
                  "--distance": `${100 + (i % 7) * 30}px`,
                }}
              />
            ))}
          </div>
        )}

        {stage >= 5 && (
          <div className="final-logo">
            <img
              src={`${import.meta.env.BASE_URL}paddips-bot.png`}
              alt="PADDIPS BOT"
              onError={(e) => {
                e.currentTarget.style.display = "none";
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
            position: fixed; inset: 0; z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; color: white;
            background: radial-gradient(circle at center, #5b21b6, #17134d 52%, #02020d);
            font-family: Arial, sans-serif;
          }
          .stars { position: absolute; inset: 0; }
          .star {
            position: absolute; width: 3px; height: 3px;
            border-radius: 50%; background: white;
            box-shadow: 0 0 10px white;
            animation: blink 2s infinite;
          }
          @keyframes blink { 0%,100% {opacity:.2} 50% {opacity:1} }
          .background-glow {
            position: absolute; width: 65vw; height: 65vw;
            border-radius: 50%;
            background: radial-gradient(circle, #a78bfa66, transparent 70%);
            animation: glow 3s infinite alternate;
          }
          @keyframes glow { to { transform: scale(1.3); opacity:.5 } }
          .orb {
            position: absolute; border-radius: 50%; filter: blur(8px);
            opacity: .5; animation: float 4s infinite alternate;
          }
          .orb1 { width:140px;height:140px;left:8%;top:15%;background:#7c3aed }
          .orb2 { width:180px;height:180px;right:8%;bottom:12%;background:#4f46e5 }
          @keyframes float { to { transform: translateY(-30px) scale(1.1) } }
          .splash-robot,.splash-brand {
            position:absolute; top:50%; width:260px; text-align:center;
            transform:translateY(-50%); transition:all 1.2s ease;
          }
          .splash-robot { left:-300px; animation:enterLeft 1.5s forwards }
          .splash-brand { right:-300px; animation:enterRight 1.5s forwards }
          .splash-robot img,.splash-brand img {
            display:block;width:220px;height:200px;object-fit:contain;margin:auto;
            filter:drop-shadow(0 0 22px #a78bfa);
          }
          .splash-robot span { display:none; font-size:100px }
          .splash-brand h2 { font-size:25px;letter-spacing:4px }
          @keyframes enterLeft { to { left:12% } }
          @keyframes enterRight { to { right:12% } }
          .robot-center { left:calc(50% - 260px); }
          .brand-center { right:calc(50% - 260px); }
          .energy {
            position:absolute;top:50%;left:15%;right:15%;height:5px;
            background:linear-gradient(90deg,transparent,#8b5cf6,white,#a78bfa,transparent);
            box-shadow:0 0 30px #8b5cf6;animation:energyPulse .4s infinite alternate;
          }
          .energy-core {
            position:absolute;left:50%;top:50%;width:80px;height:80px;
            border-radius:50%;background:radial-gradient(circle,white,#a78bfa,transparent);
            transform:translate(-50%,-50%);animation:corePulse .5s infinite alternate;
          }
          @keyframes energyPulse { to { opacity:.4 } }
          @keyframes corePulse { to { transform:translate(-50%,-50%) scale(1.5) } }
          .explosion { position:absolute;left:50%;top:50%;z-index:20 }
          .particle {
            position:absolute;width:7px;height:7px;border-radius:50%;background:white;
            box-shadow:0 0 15px #c4b5fd;
            animation:blast 1s ease-out forwards;
          }
          @keyframes blast {
            from { transform:rotate(var(--angle)) translateX(0);opacity:1 }
            to { transform:rotate(var(--angle)) translateX(var(--distance));opacity:0 }
          }
          .final-logo {
            position:absolute;z-index:50;display:flex;flex-direction:column;
            align-items:center;text-align:center;animation:appear 1s ease-out;
          }
          .final-logo img { width:210px;height:180px;object-fit:contain;filter:drop-shadow(0 0 25px #8b5cf6) }
          .final-emoji { display:none;font-size:100px }
          .final-logo h2 { letter-spacing:5px;margin:10px 0 }
          .final-logo p { letter-spacing:4px;font-size:12px;color:#ddd6fe }
          .final-logo span { letter-spacing:2px;font-size:10px;color:#c4b5fd }
          @keyframes appear { from {opacity:0;transform:scale(.4)} to {opacity:1;transform:scale(1)} }
          .status {
            position:absolute;bottom:45px;z-index:100;color:#ddd6fe;
            font-size:12px;font-weight:bold;letter-spacing:4px;
            animation:blink 1s infinite;
          }
          @media(max-width:650px) {
            .splash-robot,.splash-brand { width:160px }
            .splash-robot img,.splash-brand img { width:140px;height:130px }
            .splash-brand h2 { font-size:15px;letter-spacing:2px }
            .robot-center { left:calc(50% - 155px) }
            .brand-center { right:calc(50% - 155px) }
            .final-logo img { width:150px;height:130px }
            .status { bottom:25px;letter-spacing:2px;font-size:10px }
          }
        `}</style>
      </div>
    );
  }

  // ---------------- CHAT PAGE ----------------

  if (page === "chat") {
    return (
      <PageShell
        icon="🤖"
        title="AI Study Chat"
        description="Ask questions and learn with PADDIPS BOT."
      >
        <section className="panel chat-panel">
          <div className="chat-toolbar">
            <div>
              <span className="online-dot" /> AI Assistant
              <p className="muted">Your personal learning companion</p>
            </div>
            <button className="secondary" onClick={clearChat}>
              Clear Chat
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`chat-bubble ${item.role === "user" ? "user-bubble" : "bot-bubble"}`}
              >
                <strong>
                  {item.role === "user" ? "👤 You" : "🤖 PADDIPS BOT"}
                </strong>
                <p>{item.text}</p>
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
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask anything about your studies..."
              maxLength={12000}
              disabled={chatLoading}
            />
            <button
              className="primary"
              type="submit"
              disabled={chatLoading || !message.trim()}
            >
              {chatLoading ? "..." : "Send ➤"}
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

  // ---------------- PDF PAGE ----------------

  if (page === "material") {
    return (
      <PageShell
        icon="📚"
        title="Study Material"
        description="Upload your PDF notes, syllabus or textbook."
      >
        <section className="panel">
          <h2>📄 Upload Study Material</h2>
          <p className="muted">PDF files only · Maximum 10 MB</p>

          <label className="file-drop">
            <span className="big-icon">☁️</span>
            <strong>Click to choose your PDF</strong>
            <small>
              {selectedFile
                ? selectedFile.name
                : "Choose syllabus, notes or textbook"}
            </small>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              hidden
            />
          </label>

          {selectedFile && (
            <p className="file-info">
              📄 {selectedFile.name} ·{" "}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <button
            className="primary full"
            onClick={uploadMaterial}
            disabled={uploadLoading || !selectedFile}
          >
            {uploadLoading ? "⏳ Reading PDF..." : "📤 Upload and Read PDF"}
          </button>

          {pdfError && <p className="error">{pdfError}</p>}

          {pdfData && (
            <div className="result-panel">
              <h2>✅ PDF Processed Successfully</h2>
              <p><strong>File:</strong> {pdfData.filename}</p>
              <p><strong>Pages:</strong> {pdfData.pages}</p>
              <p><strong>Characters:</strong> {pdfData.text.length}</p>

              <h3>📖 Extracted Content</h3>
              <div className="pdf-text">
                {pdfData.text || "No readable text was extracted."}
              </div>

              <button
                className="primary full"
                disabled={!pdfData.text}
                onClick={askAboutPDF}
              >
                🤖 Ask AI to Explain This PDF
              </button>
              <p className="muted">
                The extracted text will be placed into the chat input.
                Review it and press Send to ask the AI.
              </p>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // ---------------- QUIZ PAGE ----------------

  if (page === "quiz") {
    return (
      <PageShell
        icon="🧠"
        title="AI Quiz Arena"
        description="Challenge yourself and test your knowledge."
      >
        {!quizSubmitted && (
          <section className="panel">
            <h2>✨ Create Your Quiz</h2>
            <p className="muted">Choose your topic and question count.</p>

            <label className="field-label">📚 Quiz Topic</label>
            <input
              className="text-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Python, Java, DBMS, Cloud Computing..."
            />

            <label className="field-label">🔢 Number of Questions</label>
            <div className="count-grid">
              {[5, 10, 15, 20].map((count) => (
                <button
                  key={count}
                  className={`count-button ${quizCount === count ? "active" : ""}`}
                  onClick={() => setQuizCount(count)}
                >
                  <strong>{count}</strong>
                  <small>Questions</small>
                </button>
              ))}
            </div>

            <button
              className="primary full"
              onClick={generateQuiz}
              disabled={quizLoading}
            >
              {quizLoading
                ? "⏳ Generating quiz..."
                : `🚀 Generate ${quizCount} Questions`}
            </button>
          </section>
        )}

        {quizError && <p className="error">{quizError}</p>}

        {quiz.length > 0 && !quizSubmitted && (
          <>
            <div className="progress">
              <strong>📝 {quiz.length} Questions</strong>
              <span>
                ✅ {Object.keys(selectedAnswers).length}/{quiz.length} answered
              </span>
            </div>

            {quiz.map((question, index) => (
              <section className="question-card" key={`${index}-${question.question}`}>
                <div className="question-meta">
                  QUESTION {index + 1} OF {quiz.length}
                </div>
                <h3>{question.question}</h3>

                <div className="options">
                  {question.options.map((option, optionIndex) => {
                    const optionText = getOptionText(option);
                    const selected = selectedAnswers[index] === optionText;

                    return (
                      <label
                        className={`option ${selected ? "selected" : ""}`}
                        key={`${optionIndex}-${optionText}`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          checked={selected}
                          onChange={() => selectAnswer(index, optionText)}
                        />
                        <span className="option-letter">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span>{optionText}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            <button className="primary submit-quiz" onClick={submitQuiz}>
              ✅ Submit Quiz
            </button>
          </>
        )}

        {quizSubmitted && score !== null && (
          <>
            <section className="score-card">
              <div className="big-icon">
                {score === quiz.length
                  ? "🏆"
                  : score / quiz.length >= 0.7
                  ? "🎉"
                  : "📚"}
              </div>
              <span className="badge">QUIZ COMPLETED</span>
              <h2>Great Work! 🎓</h2>
              <div className="score-number">
                {score}<span>/{quiz.length}</span>
              </div>
              <div className="percentage">
                {Math.round((score / quiz.length) * 100)}%
              </div>
              <p>
                {score === quiz.length
                  ? "Perfect score! You mastered this topic. 🚀"
                  : score / quiz.length >= 0.7
                  ? "Excellent performance! Keep it up. 🌟"
                  : "Keep practising and learning. You can improve! 💪"}
              </p>
              <button className="primary" onClick={resetQuiz}>
                🔄 Start New Quiz
              </button>
            </section>

            <h2 className="center">📋 Answer Review</h2>

            {quiz.map((question, index) => {
              const correctAnswer = getCorrectAnswer(question);
              const userAnswer = selectedAnswers[index];
              const correct =
                userAnswer !== undefined &&
                correctAnswer.trim() === userAnswer.trim();

              return (
                <section className="question-card" key={`review-${index}`}>
                  <div className={`review-status ${correct ? "right" : "wrong"}`}>
                    {correct ? "✓ Correct" : "✕ Incorrect"}
                  </div>
                  <h3>{index + 1}. {question.question}</h3>
                  <p><strong>Your answer:</strong> {userAnswer || "Not answered"}</p>
                  {!correct && (
                    <p>
                      <strong>Correct answer:</strong>{" "}
                      {correctAnswer || "Not provided"}
                    </p>
                  )}
                </section>
              );
            })}
          </>
        )}
      </PageShell>
    );
  }

  // ---------------- STUDY PLANNER ----------------

  if (page === "plan") {
    return (
      <PageShell
        icon="📅"
        title="AI Study Planner"
        description="Create your personalized study schedule."
      >
        <section className="panel">
          <h2>🚀 Build Your Plan</h2>
          <p className="muted">
            Tell PADDIPS BOT what you want to learn.
          </p>

          <label className="field-label">📚 Subject</label>
          <input
            className="text-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Python, Cloud Computing, GATE..."
          />

          <label className="field-label">📅 Number of Days</label>
          <input
            className="text-input"
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Example: 7"
          />

          <button
            className="primary full"
            onClick={generateStudyPlan}
            disabled={planLoading}
          >
            {planLoading ? "⏳ Creating your plan..." : "🤖 Generate Study Plan"}
          </button>

          {planError && <p className="error">{planError}</p>}

          {studyPlan && (
            <div className="result-panel">
              <h2>✅ Your Personalized Study Plan</h2>
              <div className="pdf-text">{studyPlan}</div>
              <button
                className="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(studyPlan);
                }}
              >
                📋 Copy Study Plan
              </button>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // ---------------- HOME DASHBOARD ----------------

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, sans-serif; }
        button,input { font: inherit; }
        button { transition: transform .2s, box-shadow .2s; }
        button:not(:disabled) { cursor: pointer; }
        button:not(:disabled):hover { transform: translateY(-2px); }
        .app {
          min-height: 100vh; color: #30205f;
          background:
            radial-gradient(circle at top left,#7c3aed28,transparent 30%),
            radial-gradient(circle at top right,#4f46e51f,transparent 28%),
            linear-gradient(135deg,#f8f6ff,#eee9ff 45%,#faf9ff);
        }
        .navbar {
          min-height:76px;padding:14px 6%;display:flex;align-items:center;
          justify-content:space-between;gap:15px;background:#ffffffdf;
          border-bottom:1px solid #8b5cf626;box-shadow:0 10px 35px #3c2a121a;
          backdrop-filter:blur(18px);position:sticky;top:0;z-index:50;
        }
        .brand-area { display:flex;align-items:center;gap:12px; }
        .brand-logo {
          width:46px;height:46px;display:grid;place-items:center;border-radius:14px;
          color:white;font-size:24px;background:linear-gradient(135deg,#7c3aed,#6366f1);
          box-shadow:0 8px 25px #5b3cc44d;
        }
        .navbar h2 { margin:0;color:#5232b0;font-size:23px;font-weight:900; }
        .navbar small { display:block;color:#81769c;font-size:11px;margin-top:2px; }
        .primary,.profile-btn {
          border:0;border-radius:13px;padding:12px 20px;color:white;
          background:linear-gradient(135deg,#7c3aed,#5b3cc4,#6366f1);
          font-weight:800;box-shadow:0 8px 22px #5b3cc433;
        }
        .primary:disabled { opacity:.55;cursor:not-allowed; }
        .secondary {
          border:1px solid #d8cef6;border-radius:12px;padding:10px 14px;
          color:#5b3cc4;background:white;font-weight:800;
        }
        .container { width:min(1150px,92%);margin:auto;padding:55px 0 80px; }
        .welcome {
          position:relative;overflow:hidden;text-align:center;padding:65px 25px;
          border-radius:32px;background:linear-gradient(135deg,#ffffffed,#f0eafff2);
          border:1px solid #8b5cf62b;box-shadow:0 20px 60px #412d211f;
          animation:welcomeIn .7s ease both;
        }
        @keyframes welcomeIn {
          from { opacity:0;transform:translateY(18px) }
          to { opacity:1;transform:translateY(0) }
        }
        .welcome:before,.welcome:after {
          content:"";position:absolute;width:260px;height:260px;border-radius:50%;
          pointer-events:none;background:radial-gradient(circle,#7c3aed2b,transparent 70%);
        }
        .welcome:before { top:-140px;right:-80px; }
        .welcome:after { bottom:-140px;left:-80px; }
        .welcome-content { position:relative;z-index:2; }
        .welcome-badge,.badge {
          display:inline-flex;padding:8px 14px;border-radius:999px;
          background:#eee8ff;color:#663db5;font-weight:800;font-size:13px;margin-bottom:18px;
        }
        .welcome h1 {
          margin:0 auto 14px;max-width:850px;font-size:clamp(34px,5vw,56px);
          line-height:1.08;color:#34206d;
        }
        .welcome h1 span {
          background:linear-gradient(90deg,#7c3aed,#4f46e5,#9333ea);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        }
        .welcome p { margin:auto;max-width:720px;color:#6b6480;font-size:17px;line-height:1.75; }
        .home-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px; }
        .mini-stat {
          padding:19px;border-radius:18px;background:#ffffffd1;border:1px solid #8b5cf620;
          box-shadow:0 10px 30px #412d1212;
        }
        .mini-stat strong { display:block;font-size:25px;color:#5b3cc4;margin-bottom:4px; }
        .mini-stat span { color:#81769c;font-size:13px;font-weight:700; }
        .cards { display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:30px; }
        .card {
          position:relative;overflow:hidden;padding:27px 22px 22px;border-radius:24px;
          background:linear-gradient(160deg,#fff,#f8f6ff);border:1px solid #8b5cf624;
          box-shadow:0 13px 38px #412d1217;transition:transform .25s,box-shadow .25s;
          animation:welcomeIn .6s ease both;
        }
        .card:hover { transform:translateY(-8px);box-shadow:0 22px 50px #5b3cc42b; }
        .card:before {
          content:"";position:absolute;left:0;top:0;width:100%;height:5px;
          background:linear-gradient(90deg,#7c3aed,#6366f1,#a855f7);
        }
        .card .icon {
          width:62px;height:62px;display:grid;place-items:center;border-radius:18px;
          background:linear-gradient(135deg,#eee8ff,#e6e0ff);font-size:29px;margin-bottom:18px;
        }
        .card h3 { margin:0 0 10px;color:#3b2675;font-size:21px; }
        .card p { min-height:86px;margin:0 0 18px;color:#716a83;line-height:1.6;font-size:14px; }
        .card button {
          width:100%;padding:12px 15px;border:0;border-radius:12px;color:white;
          background:linear-gradient(135deg,#7c3aed,#5b3cc4);font-weight:800;
        }
        .page-shell {
          min-height:100vh;padding:30px 20px 70px;color:#30205f;
          background:radial-gradient(circle at top left,#7c3aed26,transparent 30%),
          linear-gradient(135deg,#faf9ff,#f0ebff,#fbfaff);
        }
        .page-inner { width:min(1000px,100%);margin:auto; }
        .back-button {
          padding:11px 20px;border:0;border-radius:12px;
          background:linear-gradient(135deg,#7c3aed,#5b3cc4);color:white;font-weight:800;
        }
        .page-hero { text-align:center;padding:25px 15px 32px; }
        .hero-icon { font-size:45px; }
        .page-hero h1 { margin:12px 0 10px;font-size:clamp(30px,5vw,44px);color:#3d2478; }
        .page-hero p,.muted { color:#716a83;line-height:1.6; }
        .panel,.question-card,.score-card,.result-panel {
          padding:28px;margin:18px auto;border-radius:22px;
          background:linear-gradient(145deg,#fff,#f4f0ff);
          border:1px solid #8b5cf622;box-shadow:0 15px 40px #412d121a;
        }
        .panel { max-width:760px; }
        .panel h2,.result-panel h2 { color:#3d2478; }
        .field-label { display:block;margin:22px 0 9px;font-weight:800;color:#4b367e; }
        .text-input {
          display:block;width:100%;padding:14px 16px;border-radius:13px;
          border:1px solid #d8cef6;outline:none;font-size:16px;color:#30205f;background:white;
        }
        .text-input:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px #8b5cf622; }
        .count-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:15px 0 22px; }
        .count-button {
          padding:14px 8px;border-radius:13px;border:1px solid #ddd4f7;background:white;
          color:#594d74;display:flex;flex-direction:column;gap:4px;
        }
        .count-button.active { color:white;background:linear-gradient(135deg,#7c3aed,#6366f1); }
        .full { width:100%;margin-top:22px; }
        .error {
          padding:14px 17px;color:#b42345;background:#fff1f2;
          border:1px solid #fecdd3;border-radius:13px;font-weight:700;overflow-wrap:anywhere;
        }
        .progress {
          display:flex;justify-content:space-between;gap:12px;padding:15px;
          border-radius:13px;background:#eee8ff;color:#50369a;margin:20px 0;
        }
        .question-card { max-width:900px; }
        .question-meta { color:#81769c;font-size:12px;font-weight:900;letter-spacing:1px; }
        .question-card h3 { color:#35206e;line-height:1.55; }
        .options { display:grid;gap:10px; }
        .option {
          display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #e4dfef;
          border-radius:13px;background:white;cursor:pointer;
        }
        .option.selected { background:#f0ebff;border-color:#8b5cf6; }
        .option-letter {
          width:30px;height:30px;display:grid;place-items:center;flex-shrink:0;
          border-radius:50%;background:#eee8ff;color:#633bb4;font-weight:900;
        }
        .submit-quiz { display:block;margin:25px auto; }
        .score-card { max-width:650px;text-align:center;padding:40px 25px; }
        .big-icon { font-size:50px;margin:12px; }
        .score-number { font-size:58px;font-weight:900;color:#5b3cc4; }
        .score-number span { font-size:25px;color:#81769c; }
        .percentage {
          display:inline-block;padding:8px 20px;border-radius:30px;
          background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;font-size:22px;font-weight:900;
        }
        .review-status { font-weight:900; }
        .review-status.right { color:#15803d; }
        .review-status.wrong { color:#dc2626; }
        .center { text-align:center; }
        .file-drop {
          display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px;
          border:2px dashed #a78bfa;border-radius:18px;background:#faf8ff;cursor:pointer;text-align:center;
        }
        .file-drop small { overflow-wrap:anywhere; }
        .file-info { padding:13px;background:#eee8ff;border-radius:12px;overflow-wrap:anywhere; }
        .pdf-text {
          max-height:520px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;
          line-height:1.75;padding:20px;border:1px solid #e8e1fb;background:white;border-radius:13px;
        }
        .chat-toolbar { display:flex;align-items:center;justify-content:space-between;gap:12px; }
        .chat-toolbar p { margin:5px 0; }
        .online-dot {
          display:inline-block;width:9px;height:9px;border-radius:50%;
          background:#22c55e;margin-right:7px;box-shadow:0 0 10px #22c55e88;
        }
        .chat-messages {
          display:flex;flex-direction:column;gap:14px;max-height:470px;overflow:auto;
          padding:15px;background:#faf8ff;border-radius:15px;margin-top:18px;
        }
        .chat-bubble {
          max-width:90%;padding:14px 16px;border-radius:15px;
          overflow-wrap:anywhere;box-shadow:0 5px 18px #39216b12;
        }
        .chat-bubble p { margin:7px 0 0;line-height:1.7;white-space:pre-wrap; }
        .bot-bubble { align-self:flex-start;background:white;color:#30205f; }
        .user-bubble {
          align-self:flex-end;color:white;
          background:linear-gradient(135deg,#7c3aed,#6366f1);
        }
        .chat-form { display:flex;flex-wrap:wrap;gap:10px;margin-top:18px; }
        .chat-form .text-input { flex:1 1 220px; }
        .suggestions { display:flex;flex-wrap:wrap;gap:8px;margin-top:13px; }
        .suggestion {
          padding:8px 12px;border:1px solid #ddd4f7;border-radius:20px;
          background:white;color:#5b3cc4;font-size:12px;
        }
        @media(max-width:900px) { .cards { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:600px) {
          .navbar h2 { font-size:18px; }
          .navbar small { display:none; }
          .navbar { padding:12px 4%; }
          .profile-btn { padding:10px 12px;font-size:12px; }
          .container { width:94%;padding-top:28px; }
          .welcome { padding:40px 18px; }
          .cards,.home-stats { grid-template-columns:1fr; }
          .card p { min-height:auto; }
          .count-grid { grid-template-columns:repeat(2,1fr); }
          .panel,.question-card { padding:20px; }
          .progress { flex-direction:column; }
          .chat-toolbar { align-items:flex-start; }
          .chat-bubble { max-width:100%; }
          .page-shell { padding:20px 12px 50px; }
        }
      `}</style>

      <nav className="navbar">
        <div className="brand-area">
          <div className="brand-logo">🤖</div>
          <div>
            <h2>PADDIPS BOT</h2>
            <small>AI LEARNING ASSISTANT</small>
          </div>
        </div>

        <button className="profile-btn" onClick={() => goTo("home")}>
          🎓 Student
        </button>
      </nav>

      <main className="container">
        <section className="welcome">
          <div className="welcome-content">
            <div className="welcome-badge">✨ OPENAI LEARNING ASSISTANT</div>

            <h1>
              Welcome to <span>PADDIPS BOT</span> 🤖
            </h1>

            <p>
              Your smart learning companion for asking questions,
              generating quizzes, reading study materials and building
              personalized study plans. Learn smarter, every day!
            </p>

            <div className="home-stats">
              <div className="mini-stat">
                <strong>🤖 AI</strong>
                <span>Smart Learning</span>
              </div>
              <div className="mini-stat">
                <strong>📚 24/7</strong>
                <span>Study Support</span>
              </div>
              <div className="mini-stat">
                <strong>⚡ Fast</strong>
                <span>Instant Assistance</span>
              </div>
            </div>
          </div>
        </section>

        <section className="cards">
          <FeatureCard
            icon="💬"
            title="Ask AI"
            description="Ask questions and get clear explanations from your AI study assistant."
            button="Start Chat →"
            onClick={() => goTo("chat")}
          />

          <FeatureCard
            icon="📚"
            title="Study Material"
            description="Upload your syllabus, notes or textbook PDF and extract readable content."
            button="Upload Material →"
            onClick={() => goTo("material")}
          />

          <FeatureCard
            icon="📝"
            title="Take Quiz"
            description="Generate 5, 10, 15 or 20 questions and review your answers."
            button="Start Quiz →"
            onClick={() => goTo("quiz")}
          />

          <FeatureCard
            icon="📅"
            title="Study Plan"
            description="Build a personalized learning schedule based on your subject and available days."
            button="Create Plan →"
            onClick={() => goTo("plan")}
          />
        </section>

        <footer style={{ textAlign: "center", padding: "35px 10px 0", color: "#81769c" }}>
          <p>💜 Made for learners · PADDIPS BOT AI Learning Assistant</p>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, button, onClick }) {
  return (
    <div className="card">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onClick}>{button}</button>
    </div>
  );
}

export default App;
