import { useEffect, useState } from "react";
import "./App.css";
import Chat from "./Chat";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://paddips-bot.onrender.com"
).replace(/\/+$/, "");

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function App() {
  const [stage, setStage] = useState(1);
  const [page, setPage] = useState("home");

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
  const [days, setDays] = useState("");
  const [studyPlan, setStudyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // PDF
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 1800),
      setTimeout(() => setStage(3), 3600),
      setTimeout(() => setStage(4), 5000),
      setTimeout(() => setStage(5), 6500),
      setTimeout(() => setStage(6), 8500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // ---------------- API HELPER ----------------

  async function requestJSON(path, options = {}) {
    let response;

    try {
      response = await fetch(`${API_URL}${path}`, options);
    } catch {
      throw new Error(
        "Cannot connect to the backend. Check your internet connection and backend URL."
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The backend returned an invalid response. Please try again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error || `Request failed (${response.status})`
      );
    }

    return data;
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
      const data = await requestJSON("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim() || "Computer Science",
          count: Number(quizCount),
        }),
      });

      if (!Array.isArray(data.questions)) {
        throw new Error("The backend did not return valid quiz questions.");
      }

      const questions = data.questions
        .filter(
          (question) =>
            question &&
            typeof question.question === "string" &&
            Array.isArray(question.options)
        )
        .slice(0, Number(quizCount));

      if (questions.length === 0) {
        throw new Error(
          "No valid questions were generated. Try another topic."
        );
      }

      setQuiz(questions);
    } catch (error) {
      console.error("Quiz error:", error);
      setQuizError(error.message || "Quiz generation failed.");
    } finally {
      setQuizLoading(false);
    }
  }

  function getCorrectAnswer(question) {
    const answer = question.answer ?? question.correctAnswer;

    if (typeof answer === "number") {
      const option = question.options?.[answer];
      return typeof option === "string"
        ? option
        : option?.text ?? option?.label ?? option?.value ?? "";
    }

    if (typeof answer === "string") {
      const match = answer.match(/^([A-D])(?:[\s).:-]|$)/i);

      if (match && question.options?.length) {
        const index = match[1].toUpperCase().charCodeAt(0) - 65;
        const option = question.options[index];

        if (option !== undefined) {
          return typeof option === "string"
            ? option
            : option.text ?? option.label ?? option.value ?? answer;
        }
      }

      return answer;
    }

    return "";
  }

  function getOptionText(option) {
    if (typeof option === "string") return option;

    return String(
      option?.text ?? option?.label ?? option?.value ?? ""
    );
  }

  function selectAnswer(questionIndex, answer) {
    if (quizSubmitted) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));
  }

  function submitQuiz() {
    if (quiz.length === 0) return;

    const total = quiz.reduce((count, question, index) => {
      return (
        count +
        (selectedAnswers[index] === getCorrectAnswer(question) ? 1 : 0)
      );
    }, 0);

    setScore(total);
    setQuizSubmitted(true);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
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

    if (!days || Number(days) < 1 || Number(days) > 365) {
      setPlanError("Enter a number of days between 1 and 365.");
      return;
    }

    setPlanLoading(true);

    try {
      const data = await requestJSON("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      console.error("Study plan error:", error);
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
      setPdfError("Please select a PDF file only.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setPdfError("The PDF must be smaller than 10 MB.");
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

      const data = await requestJSON("/api/upload-material", {
        method: "POST",
        body: formData,
      });

      setPdfData({
        filename: data.filename || selectedFile.name,
        pages: data.pages ?? "N/A",
        text: data.text || "",
      });
    } catch (error) {
      console.error("PDF upload error:", error);
      setPdfError(error.message || "PDF upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }

  // ---------------- SPLASH SCREEN ----------------

  if (stage < 6) {
    return (
      <div className="splash">
        <div className="stars">
          {Array.from({ length: 60 }, (_, index) => (
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

        <img
          src={`${import.meta.env.BASE_URL}paddips.png`}
          alt="PADDIPS"
          className={`side-image paddips ${
            stage >= 3 ? "paddips-center" : ""
          } ${stage >= 4 ? "hide" : ""}`}
        />

        <img
          src={`${import.meta.env.BASE_URL}bot.png`}
          alt="Robot"
          className={`side-image bot ${
            stage >= 3 ? "bot-center" : ""
          } ${stage >= 4 ? "hide" : ""}`}
        />

        {stage >= 3 && stage < 5 && (
          <>
            <div className="energy energy-left" />
            <div className="energy energy-right" />
            <div className="center-energy" />
          </>
        )}

        {stage === 4 && (
          <div className="explosion">
            <div className="explosion-core" />
            <div className="ring ring1" />
            <div className="ring ring2" />
            <div className="ring ring3" />

            {Array.from({ length: 45 }, (_, index) => (
              <span
                key={index}
                className="particle"
                style={{
                  "--angle": `${index * 8.1}deg`,
                  "--distance": `${120 + (index % 8) * 24}px`,
                  animationDelay: `${(index % 5) * 0.04}s`,
                }}
              />
            ))}
          </div>
        )}

        {stage >= 5 && (
          <div className="final-logo">
            <div className="logo-glow" />

            <img
              src={`${import.meta.env.BASE_URL}paddips-bot.png`}
              alt="PADDIPS BOT"
            />

            <h3>AI LEARNING ASSISTANT</h3>
            <div className="ready-line">
              ✦ INTELLIGENT • FAST • SMART ✦
            </div>
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
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: radial-gradient(circle at center, #5b21b6, #17134d 50%, #02020d);
            z-index: 9999;
            font-family: Arial, sans-serif;
          }
          .stars { position: absolute; inset: 0; }
          .star {
            position: absolute;
            width: 3px; height: 3px;
            border-radius: 50%; background: white;
            box-shadow: 0 0 10px white;
            animation: starBlink 2s infinite;
          }
          @keyframes starBlink {
            0%,100% { opacity: .2; }
            50% { opacity: 1; }
          }
          .background-glow {
            position: absolute;
            width: 70vw; height: 70vw;
            border-radius: 50%;
            background: radial-gradient(circle, #a78bfa55, #6366f133, transparent 70%);
            animation: bgPulse 3s infinite;
          }
          @keyframes bgPulse {
            0%,100% { transform: scale(.8); opacity: .5; }
            50% { transform: scale(1.2); opacity: 1; }
          }
          .orb {
            position: absolute; border-radius: 50%;
            filter: blur(8px); opacity: .5;
            animation: orbFloat 5s infinite ease-in-out;
          }
          .orb1 {
            width: 150px; height: 150px;
            left: 8%; top: 18%; background: #7c3aed;
          }
          .orb2 {
            width: 190px; height: 190px;
            right: 6%; bottom: 12%; background: #4f46e5;
            animation-direction: reverse;
          }
          @keyframes orbFloat {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-30px) scale(1.1); }
          }
          .side-image {
            position: absolute; top: 50%;
            width: 280px; height: 280px;
            object-fit: contain; z-index: 10;
            filter: drop-shadow(0 0 25px #8b5cf6);
          }
          .paddips {
            right: -350px; transform: translateY(-50%);
            animation: paddipsIn 1.8s ease-out forwards;
          }
          @keyframes paddipsIn {
            from { right: -350px; opacity: 0; transform: translateY(-50%) scale(.6); }
            to { right: 12%; opacity: 1; transform: translateY(-50%) scale(1); }
          }
          .bot {
            left: -350px; opacity: 0; transform: translateY(-50%);
            animation: botIn 1.8s 1.8s ease-out forwards;
          }
          @keyframes botIn {
            from { left: -350px; opacity: 0; transform: translateY(-50%) scale(.6); }
            to { left: 12%; opacity: 1; transform: translateY(-50%) scale(1); }
          }
          .paddips-center { animation: paddipsMove 1.4s ease-in-out forwards; }
          .bot-center { animation: botMove 1.4s ease-in-out forwards; }
          @keyframes paddipsMove {
            to { right: 50%; margin-right: -140px; transform: translateY(-50%) scale(1.08); }
          }
          @keyframes botMove {
            to { left: 50%; margin-left: -140px; transform: translateY(-50%) scale(1.08); }
          }
          .hide { opacity: 0 !important; }
          .energy {
            position: absolute; top: 50%; width: 45%; height: 5px;
            transform: translateY(-50%);
            background: linear-gradient(90deg, transparent, #8b5cf6, white, #a78bfa, transparent);
            box-shadow: 0 0 25px #8b5cf6;
            animation: energy .4s infinite alternate;
          }
          .energy-left { left: 0; }
          .energy-right { right: 0; }
          @keyframes energy {
            from { opacity: .4; }
            to { opacity: 1; }
          }
          .center-energy {
            position: absolute; width: 110px; height: 110px;
            border-radius: 50%;
            background: radial-gradient(circle, white, #a78bfa 25%, transparent 70%);
            box-shadow: 0 0 80px #8b5cf6;
            animation: centerPulse .5s infinite alternate;
          }
          @keyframes centerPulse {
            from { transform: scale(.6); }
            to { transform: scale(1.4); }
          }
          .explosion {
            position: absolute; width: 300px; height: 300px;
            top: 50%; left: 50%; transform: translate(-50%,-50%);
            z-index: 100;
          }
          .explosion-core {
            position: absolute; top: 50%; left: 50%;
            width: 100px; height: 100px; border-radius: 50%;
            background: radial-gradient(circle, white, #a78bfa 35%, transparent 75%);
            animation: explode .9s forwards;
          }
          @keyframes explode {
            from { transform: translate(-50%,-50%) scale(.2); opacity: 1; }
            to { transform: translate(-50%,-50%) scale(5); opacity: 0; }
          }
          .ring {
            position: absolute; top: 50%; left: 50%;
            width: 70px; height: 70px; border: 4px solid #a78bfa;
            border-radius: 50%; animation: ringExpand 1.2s ease-out forwards;
          }
          .ring2 { animation-delay: .15s; }
          .ring3 { animation-delay: .3s; }
          @keyframes ringExpand {
            from { transform: translate(-50%,-50%) scale(0); opacity: 1; }
            to { transform: translate(-50%,-50%) scale(7); opacity: 0; }
          }
          .particle {
            position: absolute; top: 50%; left: 50%;
            width: 7px; height: 7px; border-radius: 50%;
            background: white; animation: particleBlast 1.2s ease-out forwards;
          }
          @keyframes particleBlast {
            from { transform: translate(-50%,-50%) rotate(var(--angle)) translateX(0); opacity: 1; }
            to { transform: translate(-50%,-50%) rotate(var(--angle)) translateX(var(--distance)); opacity: 0; }
          }
          .final-logo {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%,-50%);
            display: flex; flex-direction: column; align-items: center;
            z-index: 200; animation: logoAppear 1.3s ease-out forwards;
          }
          .final-logo img {
            width: 210px; max-width: 45vw; object-fit: contain;
            filter: drop-shadow(0 0 25px #8b5cf6);
            animation: logoFloat 2s infinite alternate;
          }
          @keyframes logoAppear {
            from { opacity: 0; transform: translate(-50%,-50%) scale(.2); }
            to { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          }
          @keyframes logoFloat {
            to { transform: translateY(-7px); }
          }
          .logo-glow {
            position: absolute; width: 260px; height: 260px;
            border-radius: 50%;
            background: radial-gradient(circle, #8b5cf655, transparent 65%);
            filter: blur(20px);
          }
          .final-logo h3 {
            margin: 10px 0 0; color: white; font-size: 12px;
            letter-spacing: 4px; text-align: center;
          }
          .ready-line {
            margin-top: 8px; font-size: 9px;
            letter-spacing: 3px; color: #ddd6fe; text-align: center;
          }
          .status {
            position: absolute; bottom: 55px; left: 50%;
            transform: translateX(-50%); color: #ddd6fe;
            font-size: 14px; font-weight: bold; letter-spacing: 5px;
            z-index: 300; animation: statusBlink 1s infinite;
            white-space: nowrap;
          }
          @keyframes statusBlink {
            0%,100% { opacity: .4; }
            50% { opacity: 1; }
          }
          @media(max-width: 768px) {
            .side-image { width: 180px; height: 180px; }
            .final-logo img { width: 140px; }
            .logo-glow { width: 180px; height: 180px; }
            .final-logo h3 { font-size: 8px; letter-spacing: 2px; }
            .ready-line { font-size: 7px; letter-spacing: 1px; }
            .status { bottom: 30px; font-size: 10px; letter-spacing: 2px; }
          }
        `}</style>
      </div>
    );
  }

  // ---------------- CHAT PAGE ----------------

  if (page === "chat") {
    return (
      <PageShell onBack={() => setPage("home")} icon="🤖" title="AI Study Chat"
        description="Ask questions and learn with PADDIPS BOT">
        <Chat />
      </PageShell>
    );
  }

  // ---------------- MATERIAL PAGE ----------------

  if (page === "material") {
    return (
      <PageShell onBack={() => setPage("home")} icon="📚" title="Study Material"
        description="Upload your PDF and let PADDIPS BOT read your study material.">
        <section className="panel">
          <h2>📄 Upload Study Material</h2>
          <p className="muted">PDF only · Maximum 10 MB</p>

          <label className="file-drop">
            <span className="big-icon">☁️</span>
            <strong>Click to choose your PDF</strong>
            <small>{selectedFile ? selectedFile.name : "Choose syllabus, notes or textbook"}</small>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              hidden
            />
          </label>

          {selectedFile && (
            <p className="file-info">
              📄 {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <button
            className="primary full"
            onClick={uploadMaterial}
            disabled={uploadLoading || !selectedFile}
          >
            {uploadLoading ? "⏳ Uploading and reading..." : "📤 Upload PDF"}
          </button>

          {pdfError && <p className="error">{pdfError}</p>}

          {pdfData && (
            <div className="result-panel">
              <h2>✅ PDF Uploaded Successfully</h2>
              <p><strong>File:</strong> {pdfData.filename}</p>
              <p><strong>Pages:</strong> {pdfData.pages}</p>
              <p><strong>Characters:</strong> {pdfData.text.length}</p>
              <h3>📖 Extracted PDF Content</h3>
              <div className="pdf-text">
                {pdfData.text || "No readable text was extracted from this PDF."}
              </div>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // ---------------- QUIZ PAGE ----------------

  if (page === "quiz") {
    return (
      <PageShell onBack={() => setPage("home")} icon="🧠" title="AI Quiz Arena"
        description="Challenge yourself and test your knowledge.">

        {!quizSubmitted && (
          <section className="panel">
            <h2>✨ Create Your Quiz</h2>
            <p className="muted">Choose a topic and number of questions.</p>

            <label className="field-label">📚 Quiz Topic</label>
            <input
              className="text-input"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="JavaScript, Python, DBMS..."
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

            <button className="primary full" onClick={generateQuiz} disabled={quizLoading}>
              {quizLoading ? "⏳ Generating your quiz..." : `🚀 Generate ${quizCount} Questions`}
            </button>
          </section>
        )}

        {quizError && <p className="error">{quizError}</p>}

        {quiz.length > 0 && !quizSubmitted && (
          <>
            <div className="progress">
              📝 {quiz.length} Questions
              <span>✅ {Object.keys(selectedAnswers).length}/{quiz.length} answered</span>
            </div>

            {quiz.map((question, index) => (
              <section className="question-card" key={`${index}-${question.question}`}>
                <div className="question-meta">QUESTION {index + 1} OF {quiz.length}</div>
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
                {score === quiz.length ? "🏆" : score / quiz.length >= 0.7 ? "🎉" : "📚"}
              </div>
              <span className="badge">QUIZ COMPLETED</span>
              <h2>Great Work! 🎓</h2>
              <div className="score-number">{score}<span>/{quiz.length}</span></div>
              <div className="percentage">{Math.round(score / quiz.length * 100)}%</div>
              <p>
                {score === quiz.length
                  ? "Perfect score! You mastered this topic. 🚀"
                  : score / quiz.length >= 0.7
                  ? "Excellent performance! Keep it up. 🌟"
                  : "Keep practising and learning. You can improve! 💪"}
              </p>
              <button className="primary" onClick={resetQuiz}>🔄 Start New Quiz</button>
            </section>

            <h2 className="center">📋 Answer Review</h2>

            {quiz.map((question, index) => {
              const correctAnswer = getCorrectAnswer(question);
              const userAnswer = selectedAnswers[index];
              const correct = userAnswer === correctAnswer;

              return (
                <section className="question-card" key={`review-${index}`}>
                  <div className={`review-status ${correct ? "right" : "wrong"}`}>
                    {correct ? "✓ Correct" : "✕ Incorrect"}
                  </div>
                  <h3>{index + 1}. {question.question}</h3>
                  <p><strong>Your answer:</strong> {userAnswer || "Not answered"}</p>
                  {!correct && <p><strong>Correct answer:</strong> {correctAnswer || "Not provided by backend"}</p>}
                </section>
              );
            })}
          </>
        )}
      </PageShell>
    );
  }

  // ---------------- STUDY PLAN PAGE ----------------

  if (page === "plan") {
    return (
      <PageShell onBack={() => setPage("home")} icon="📅" title="AI Study Planner"
        description="Build a personalized learning schedule.">
        <section className="panel">
          <h2>🚀 Build Your Plan</h2>
          <p className="muted">Tell PADDIPS BOT what you want to study.</p>

          <label className="field-label">📚 Subject</label>
          <input
            className="text-input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Example: JavaScript"
          />

          <label className="field-label">📅 Number of Days</label>
          <input
            className="text-input"
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            placeholder="Example: 7"
          />

          <button className="primary full" onClick={generateStudyPlan} disabled={planLoading}>
            {planLoading ? "⏳ Creating your plan..." : "🤖 Generate Study Plan"}
          </button>

          {planError && <p className="error">{planError}</p>}
          {studyPlan && (
            <div className="result-panel">
              <h2>✅ Your Personalized Study Plan</h2>
              <div className="pdf-text">{studyPlan}</div>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  // ---------------- HOME PAGE ----------------

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, sans-serif; }
        .app {
          min-height: 100vh; color: #30205f;
          background:
            radial-gradient(circle at top left, #7c3aed28, transparent 30%),
            radial-gradient(circle at top right, #4f46e51f, transparent 28%),
            linear-gradient(135deg, #f8f6ff, #eee9ff 45%, #faf9ff);
        }
        .navbar {
          min-height: 76px; padding: 14px 6%;
          display: flex; align-items: center; justify-content: space-between;
          background: #ffffffdf; border-bottom: 1px solid #8b5cf626;
          box-shadow: 0 10px 35px #3c2a121a; backdrop-filter: blur(18px);
          position: sticky; top: 0; z-index: 50;
        }
        .brand-area { display: flex; align-items: center; gap: 12px; }
        .brand-logo {
          width: 46px; height: 46px; display: grid; place-items: center;
          border-radius: 14px; color: white; font-size: 22px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          box-shadow: 0 8px 25px #5b3cc44d;
        }
        .navbar h2 { margin: 0; color: #5232b0; font-size: 23px; font-weight: 900; }
        .navbar small { display: block; color: #81769c; font-size: 11px; margin-top: 2px; }
        .profile-btn, .primary {
          border: 0; border-radius: 13px; padding: 12px 20px; color: white;
          background: linear-gradient(135deg, #7c3aed, #5b3cc4, #6366f1);
          font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px #5b3cc433;
          transition: transform .2s, box-shadow .2s;
        }
        .primary:hover, .profile-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 26px #5b3cc44d; }
        .primary:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        .container { width: min(1150px, 92%); margin: auto; padding: 55px 0 80px; }
        .welcome {
          position: relative; overflow: hidden; text-align: center; padding: 65px 25px;
          border-radius: 32px; background: linear-gradient(135deg, #ffffffed, #f0eafff2);
          border: 1px solid #8b5cf62b; box-shadow: 0 20px 60px #412d211f;
          animation: welcomeIn .7s ease both;
        }
        @keyframes welcomeIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .welcome:before, .welcome:after {
          content: ""; position: absolute; width: 260px; height: 260px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, #7c3aed2b, transparent 70%);
        }
        .welcome:before { top: -140px; right: -80px; }
        .welcome:after { bottom: -140px; left: -80px; }
        .welcome-content { position: relative; z-index: 2; }
        .welcome-badge, .badge {
          display: inline-flex; padding: 8px 14px; border-radius: 999px;
          background: #eee8ff; color: #663db5; font-weight: 800; font-size: 13px;
          margin-bottom: 18px;
        }
        .welcome h1 { margin: 0 auto 14px; max-width: 850px; font-size: clamp(34px, 5vw, 56px); line-height: 1.08; color: #34206d; }
        .welcome h1 span {
          background: linear-gradient(90deg, #7c3aed, #4f46e5, #9333ea);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .welcome p { margin: auto; max-width: 720px; color: #6b6480; font-size: 17px; line-height: 1.75; }
        .home-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 24px; }
        .mini-stat { padding: 19px; border-radius: 18px; background: #ffffffd1; border: 1px solid #8b5cf620; box-shadow: 0 10px 30px #412d1212; }
        .mini-stat strong { display: block; font-size: 25px; color: #5b3cc4; margin-bottom: 4px; }
        .mini-stat span { color: #81769c; font-size: 13px; font-weight: 700; }
        .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 30px; }
        .card {
          position: relative; overflow: hidden; padding: 27px 22px 22px;
          border-radius: 24px; background: linear-gradient(160deg, #ffffff, #f8f6ff);
          border: 1px solid #8b5cf624; box-shadow: 0 13px 38px #412d1217;
          transition: transform .25s, box-shadow .25s; animation: welcomeIn .6s ease both;
        }
        .card:hover { transform: translateY(-8px); box-shadow: 0 22px 50px #5b3cc42b; }
        .card:before { content: ""; position: absolute; left: 0; top: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #7c3aed, #6366f1, #a855f7); }
        .card .icon { width: 62px; height: 62px; display: grid; place-items: center; border-radius: 18px; background: linear-gradient(135deg, #eee8ff, #e6e0ff); font-size: 29px; margin-bottom: 18px; }
        .card h3 { margin: 0 0 10px; color: #3b2675; font-size: 21px; }
        .card p { min-height: 86px; margin: 0 0 18px; color: #716a83; line-height: 1.6; font-size: 14px; }
        .card button { width: 100%; padding: 12px 15px; border: 0; border-radius: 12px; color: white; background: linear-gradient(135deg, #7c3aed, #5b3cc4); cursor: pointer; font-size: 14px; font-weight: 800; }
        .page-shell { min-height: 100vh; padding: 30px 20px 70px; color: #30205f; background: radial-gradient(circle at top left, #7c3aed26, transparent 30%), linear-gradient(135deg, #faf9ff, #f0ebff, #fbfaff); }
        .page-inner { width: min(1000px, 100%); margin: auto; }
        .back-button { padding: 11px 20px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #5b3cc4); color: white; cursor: pointer; font-weight: 800; }
        .page-hero { text-align: center; padding: 25px 15px 32px; }
        .hero-icon { font-size: 45px; }
        .page-hero h1 { margin: 12px 0 10px; font-size: clamp(30px, 5vw, 44px); color: #3d2478; }
        .page-hero p, .muted { color: #716a83; line-height: 1.6; }
        .panel, .question-card, .score-card, .result-panel {
          padding: 28px; margin: 18px auto; border-radius: 22px;
          background: linear-gradient(145deg, #fff, #f4f0ff);
          border: 1px solid #8b5cf622; box-shadow: 0 15px 40px #412d121a;
        }
        .panel { max-width: 760px; }
        .panel h2 { color: #3d2478; }
        .field-label { display: block; margin: 22px 0 9px; font-weight: 800; color: #4b367e; }
        .text-input { display: block; width: 100%; padding: 14px 16px; border-radius: 13px; border: 1px solid #d8cef6; outline: none; font-size: 16px; color: #30205f; background: white; }
        .text-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px #8b5cf622; }
        .count-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
        .count-button { padding: 14px 8px; border-radius: 13px; border: 1px solid #ddd4f7; background: white; color: #594d74; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
        .count-button.active { color: white; background: linear-gradient(135deg, #7c3aed, #6366f1); }
        .full { width: 100%; margin-top: 22px; }
        .error { padding: 14px 17px; color: #b42345; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 13px; font-weight: 700; }
        .progress { display: flex; justify-content: space-between; gap: 12px; padding: 15px; border-radius: 13px; background: #eee8ff; color: #50369a; margin: 20px 0; }
        .question-card { max-width: 900px; }
        .question-meta { color: #81769c; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
        .question-card h3 { color: #35206e; line-height: 1.55; }
        .options { display: grid; gap: 10px; }
        .option { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #e4dfef; border-radius: 13px; background: white; cursor: pointer; }
        .option.selected { background: #f0ebff; border-color: #8b5cf6; }
        .option-letter { width: 30px; height: 30px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; background: #eee8ff; color: #633bb4; font-weight: 900; }
        .submit-quiz { display: block; margin: 25px auto; }
        .score-card { max-width: 650px; text-align: center; padding: 40px 25px; }
        .big-icon { font-size: 50px; margin: 12px; }
        .score-number { font-size: 58px; font-weight: 900; color: #5b3cc4; }
        .score-number span { font-size: 25px; color: #81769c; }
        .percentage { display: inline-block; padding: 8px 20px; border-radius: 30px; background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; font-size: 22px; font-weight: 900; }
        .review-status { font-weight: 900; }
        .review-status.right { color: #15803d; }
        .review-status.wrong { color: #dc2626; }
        .center { text-align: center; }
        .file-drop { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px; border: 2px dashed #a78bfa; border-radius: 18px; background: #faf8ff; cursor: pointer; text-align: center; }
        .file-info { padding: 13px; background: #eee8ff; border-radius: 12px; overflow-wrap: anywhere; }
        .pdf-text { max-height: 520px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.75; padding: 20px; border: 1px solid #e8e1fb; background: white; border-radius: 13px; }
        @media(max-width: 900px) { .cards { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px) {
          .navbar h2 { font-size: 18px; }
          .navbar small { display: none; }
          .container { width: 94%; padding-top: 28px; }
          .welcome { padding: 40px 18px; }
          .cards, .home-stats { grid-template-columns: 1fr; }
          .card p { min-height: auto; }
          .count-grid { grid-template-columns: repeat(2, 1fr); }
          .panel, .question-card { padding: 20px; }
          .progress { flex-direction: column; }
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
        <button className="profile-btn" onClick={() => setPage("home")}>
          🎓 Student
        </button>
      </nav>

      <main className="container">
        <section className="welcome">
          <div className="welcome-content">
            <div className="welcome-badge">✨ POWERED BY AI</div>
            <h1>Welcome to <span>PADDIPS BOT</span> 🤖</h1>
            <p>
              Your smart AI learning companion for studying, asking questions,
              generating quizzes, reading study materials, and building
              personalized study plans.
            </p>

            <div className="home-stats">
              <div className="mini-stat"><strong>🤖 AI</strong><span>Smart Learning</span></div>
              <div className="mini-stat"><strong>📚 24/7</strong><span>Study Support</span></div>
              <div className="mini-stat"><strong>⚡ Fast</strong><span>Instant Assistance</span></div>
            </div>
          </div>
        </section>

        <section className="cards">
          <FeatureCard icon="💬" title="Ask AI"
            description="Ask questions and get simple explanations from your AI study assistant."
            button="Start Chat →" onClick={() => setPage("chat")} />

          <FeatureCard icon="📚" title="Study Material"
            description="Upload your syllabus, notes, or textbook PDF and extract useful content."
            button="Upload Material →" onClick={() => setPage("material")} />

          <FeatureCard icon="📝" title="Take Quiz"
            description="Generate 5, 10, 15, or 20 questions and review your answers."
            button="Start Quiz →" onClick={() => setPage("quiz")} />

          <FeatureCard icon="📅" title="Study Plan"
            description="Create a personalized study schedule based on your subject and available days."
            button="Create Plan →" onClick={() => setPage("plan")} />
        </section>
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

function PageShell({ onBack, icon, title, description, children }) {
  return (
    <div className="page-shell">
      <div className="page-inner">
        <button className="back-button" onClick={onBack}>← Back to Home</button>
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

export default App;
