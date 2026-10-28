
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
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
      data.message ||
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
    if (options[index] !== undefined) {
      return getOptionText(options[index]);
    }
  }

  return answer;
}

/*
 IMPORTANT:
 Keep PageShell OUTSIDE App().
 This prevents the chat input from losing focus
 whenever you type a character.
*/
function PageShell({ icon, title, description, children, onHome }) {
  return (
    <div className="page-shell">
      <div className="page-inner">
        <button
          type="button"
          className="back-button"
          onClick={onHome}
        >
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

export default function App() {
  const [stage, setStage] = useState(1);
  const [page, setPage] = useState("home");

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 Welcome to PADDIPS BOT. Ask me anything you want to learn!",
    },
  ]);
  const [message, setMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Quiz state
  const [topic, setTopic] = useState("");
  const [quizCount, setQuizCount] = useState("5");
  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Study planner state
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState("7");
  const [studyPlan, setStudyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // PDF state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfError, setPdfError] = useState("");

  // Splash screen animation
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

  // Send a chat message
  async function sendMessage(event, suppliedMessage) {
    event?.preventDefault();

    const question = (suppliedMessage ?? message).trim();

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
        headers: {
          "Content-Type": "application/json",
        },
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
  
  async function generateQuiz(event) {
    event?.preventDefault();

    const cleanTopic = topic.trim();
    const count = Number(quizCount);

    if (!cleanTopic) {
      setQuizError("Please enter a topic for your quiz.");
      return;
    }

    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setQuizError("Choose between 1 and 20 questions.");
      return;
    }

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
          topic: cleanTopic,
          count,
          numberOfQuestions: count,
        }),
      });

      const questions =
        data.questions ||
        data.quiz ||
        data.data?.questions ||
        [];

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error(
          "No questions were returned. Please try another topic."
        );
      }

      setQuiz(questions);
    } catch (error) {
      setQuizError(error.message || "Unable to generate the quiz.");
    } finally {
      setQuizLoading(false);
    }
  }

  function selectAnswer(questionIndex, answer) {
    if (quizSubmitted) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));
  }

  function submitQuiz() {
    if (!quiz.length) return;

    let correct = 0;

    quiz.forEach((question, index) => {
      const correctAnswer = getCorrectAnswer(question);
      const selectedAnswer = selectedAnswers[index];

      if (
        correctAnswer &&
        selectedAnswer !== undefined &&
        String(selectedAnswer).trim().toLowerCase() ===
          String(correctAnswer).trim().toLowerCase()
      ) {
        correct += 1;
      }
    });

    setScore(correct);
    setQuizSubmitted(true);
  }

  function resetQuiz() {
    setQuiz([]);
    setSelectedAnswers({});
    setScore(null);
    setQuizSubmitted(false);
    setQuizError("");
  }

  async function generateStudyPlan(event) {
    event?.preventDefault();

    const cleanSubject = subject.trim();
    const numberOfDays = Number(days);

    if (!cleanSubject) {
      setPlanError("Please enter a subject or topic.");
      return;
    }

    if (
      !Number.isInteger(numberOfDays) ||
      numberOfDays < 1 ||
      numberOfDays > 365
    ) {
      setPlanError("Choose a duration between 1 and 365 days.");
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
          subject: cleanSubject,
          topic: cleanSubject,
          days: numberOfDays,
          duration: numberOfDays,
        }),
      });

      const plan =
        data.studyPlan ||
        data.study_plan ||
        data.plan ||
        data.result ||
        data.message;

      if (!plan) {
        throw new Error("The backend did not return a study plan.");
      }

      setStudyPlan(
        typeof plan === "string" ? plan : JSON.stringify(plan, null, 2)
      );
    } catch (error) {
      setPlanError(error.message || "Unable to create the study plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function uploadMaterial(event) {
    event?.preventDefault();

    if (!selectedFile) {
      setPdfError("Please select a PDF file first.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setPdfError("Only PDF files are supported.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setPdfError("The PDF must be 10 MB or smaller.");
      return;
    }

    setUploadLoading(true);
    setPdfError("");
    setPdfData(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const data = await apiRequest("/api/upload-material", {
        method: "POST",
        body: formData,
      });

      setPdfData(data);
    } catch (error) {
      setPdfError(error.message || "Unable to upload the PDF.");
    } finally {
      setUploadLoading(false);
    }
  }

  function formatContent(content) {
    if (typeof content === "string") return content;
    if (content == null) return "";
    return JSON.stringify(content, null, 2);
                }
    
  if (stage < 6) {
    const splashMessages = [
      "Initializing PADDIPS BOT...",
      "Preparing your learning space...",
      "Connecting learning tools...",
      "Getting things ready...",
      "Almost there...",
    ];

    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">🤖</div>
          <h1>PADDIPS BOT</h1>
          <p>AI LEARNING ASSISTANT</p>
          <div className="splash-progress">
            <div className="splash-progress-fill" />
          </div>
          <span>
            {splashMessages[Math.min(stage - 1, splashMessages.length - 1)]}
          </span>
        </div>
      </div>
    );
  }

  if (page === "chat") {
    return (
      <PageShell
        icon="💬"
        title="AI Chat Assistant"
        description="Ask questions and learn something new."
        onHome={() => goTo("home")}
      >
        <section className="content-card chat-card">
          <div className="chat-toolbar">
            <span className="status-indicator">● Ready to chat</span>
            <button
              type="button"
              className="secondary-button"
              onClick={clearChat}
            >
              Clear Chat
            </button>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`chat-message ${
                  item.role === "user" ? "user-message" : "bot-message"
                }`}
              >
                <div className="message-avatar">
                  {item.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-bubble">
                  <strong>
                    {item.role === "user" ? "You" : "PADDIPS BOT"}
                  </strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="loading-message" role="status">
                🤖 PADDIPS BOT is thinking...
              </div>
            )}
          </div>

          {chatError && (
            <p className="error-message" role="alert">
              {chatError}
            </p>
          )}

          <form className="chat-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question here..."
              aria-label="Your message"
              disabled={chatLoading}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={chatLoading || !message.trim()}
            >
              {chatLoading ? "Sending..." : "Send ➤"}
            </button>
          </form>

          <div className="suggestion-list">
            <span>Try asking:</span>
            {[
              "Explain cloud computing",
              "Teach me Python basics",
              "What is a database?",
            ].map((suggestion) => (
              <button
                type="button"
                className="suggestion-button"
                key={suggestion}
                disabled={chatLoading}
                onClick={() => sendMessage(undefined, suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      </PageShell>
    );
  }

  if (page === "quiz") {
    return (
      <PageShell
        icon="📝"
        title="Quiz Generator"
        description="Practice what you learn with a custom quiz."
        onHome={() => goTo("home")}
      >
        <section className="content-card">
          <form className="tool-form" onSubmit={generateQuiz}>
            <label htmlFor="quiz-topic">Enter your topic</label>
            <input
              id="quiz-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Example: Java, Cloud Computing, GIS"
              required
            />

            <label htmlFor="quiz-count">Number of questions</label>
            <select
              id="quiz-count"
              value={quizCount}
              onChange={(event) => setQuizCount(event.target.value)}
            >
              <option value="5">5 questions</option>
              <option value="10">10 questions</option>
              <option value="15">15 questions</option>
              <option value="20">20 questions</option>
            </select>

            <button
              type="submit"
              className="primary-button full-button"
              disabled={quizLoading}
            >
              {quizLoading ? "Generating quiz..." : "Generate Quiz ✨"}
            </button>
          </form>

          {quizError && (
            <p className="error-message" role="alert">
              {quizError}
            </p>
          )}

          {quiz.length > 0 && (
            <div className="quiz-results">
              {quizSubmitted && (
                <div className="score-card" aria-live="polite">
                  <h2>Your Result</h2>
                  <p>
                    You scored <strong>{score}</strong> out of{" "}
                    <strong>{quiz.length}</strong>.
                  </p>
                  <p>
                    Percentage:{" "}
                    <strong>
                      {Math.round((score / quiz.length) * 100)}%
                    </strong>
                  </p>
                </div>
              )}

              {quiz.map((question, index) => {
                const options = question.options || [];
                const correctAnswer = getCorrectAnswer(question);

                return (
                  <article className="question-card" key={index}>
                    <h3>
                      {index + 1}.{" "}
                      {question.question || question.text || "Question"}
                    </h3>

                    <div className="answer-options">
                      {options.map((option, optionIndex) => {
                        const optionText = getOptionText(option);
                        const isSelected =
                          selectedAnswers[index] === optionText;
                        const isCorrect =
                          quizSubmitted &&
                          optionText.toLowerCase() ===
                            correctAnswer.trim().toLowerCase();

                        return (
                          <button
                            type="button"
                            key={optionIndex}
                            className={[
                              "answer-option",
                              isSelected ? "selected" : "",
                              isCorrect ? "correct-answer" : "",
                              quizSubmitted &&
                              isSelected &&
                              !isCorrect
                                ? "wrong-answer"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              selectAnswer(index, optionText)
                            }
                            disabled={quizSubmitted}
                          >
                            <span className="option-letter">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            {optionText}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && question.explanation && (
                      <p className="explanation">
                        <strong>Explanation:</strong>{" "}
                        {question.explanation}
                      </p>
                    )}
                  </article>
                );
              })}

              {!quizSubmitted ? (
                <button
                  type="button"
                  className="primary-button full-button"
                  onClick={submitQuiz}
                >
                  Submit Answers
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button full-button"
                  onClick={resetQuiz}
                >
                  Create Another Quiz
                </button>
              )}
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  if (page === "study-plan") {
    return (
      <PageShell
        icon="📅"
        title="Study Planner"
        description="Create a study plan based on your subject and available time."
        onHome={() => goTo("home")}
      >
        <section className="content-card">
          <form className="tool-form" onSubmit={generateStudyPlan}>
            <label htmlFor="study-subject">Subject or topic</label>
            <input
              id="study-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Example: Python Programming"
              required
            />

            <label htmlFor="study-days">Study duration</label>
            <select
              id="study-days"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>

            <button
              type="submit"
              className="primary-button full-button"
              disabled={planLoading}
            >
              {planLoading ? "Creating your plan..." : "Create Study Plan"}
            </button>
          </form>

          {planError && (
            <p className="error-message" role="alert">
              {planError}
            </p>
          )}

          {studyPlan && (
            <div className="generated-content">
              <h2>Your Study Plan</h2>
              <pre>{formatContent(studyPlan)}</pre>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigator.clipboard?.writeText(studyPlan)
                }
              >
                Copy Study Plan
              </button>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  if (page === "pdf") {
    return (
      <PageShell
        icon="📚"
        title="PDF Learning Assistant"
        description="Upload a PDF learning material to process it with your backend."
        onHome={() => goTo("home")}
      >
        <section className="content-card">
          <form className="tool-form" onSubmit={uploadMaterial}>
            <label htmlFor="pdf-file">Choose a PDF file (maximum 10 MB)</label>
            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setPdfError("");
                setPdfData(null);
              }}
              required
            />

            {selectedFile && (
              <p className="file-info">
                Selected: {selectedFile.name} (
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}

            <button
              type="submit"
              className="primary-button full-button"
              disabled={uploadLoading}
            >
              {uploadLoading ? "Uploading..." : "Upload PDF"}
            </button>
          </form>

          {pdfError && (
            <p className="error-message" role="alert">
              {pdfError}
            </p>
          )}

          {pdfData && (
            <div className="generated-content">
              <h2>PDF Processing Result</h2>
              <pre>{formatContent(pdfData)}</pre>
            </div>
          )}
        </section>
      </PageShell>
    );
                     }
                
  return (
    <main className="app-home">
      <nav className="navbar">
        <button
          type="button"
          className="brand"
          onClick={() => goTo("home")}
        >
          <span className="brand-icon">🤖</span>
          <span>PADDIPS BOT</span>
        </button>

        <span className="navbar-tagline">AI Learning Assistant</span>
      </nav>

      <section className="home-hero">
        <div className="hero-badge">✨ YOUR PERSONAL LEARNING COMPANION</div>

        <h1>
          Learn Smarter.
          <br />
          <span>Grow Faster.</span>
        </h1>

        <p>
          Your learning journey starts here. Chat with your AI assistant,
          practice quizzes, plan your studies, and explore your PDF materials
          in one place.
        </p>

        <button
          type="button"
          className="primary-button hero-button"
          onClick={() => goTo("chat")}
        >
          Start Learning →
        </button>

        <div className="hero-robot" aria-hidden="true">
          <div className="robot-glow" />
          <div className="robot-face">
            <div className="robot-antenna" />
            <div className="robot-eyes">
              <span />
              <span />
            </div>
            <div className="robot-mouth" />
            <div className="robot-cheek left-cheek" />
            <div className="robot-cheek right-cheek" />
          </div>
          <div className="robot-shadow" />
        </div>
      </section>

      <section className="features-section">
        <div className="section-heading">
          <span className="eyebrow">WHAT YOU CAN DO</span>
          <h2>Your Learning Toolkit</h2>
          <p>Everything you need to make learning easier.</p>
        </div>

        <div className="feature-grid">
          <button
            type="button"
            className="feature-card feature-chat"
            onClick={() => goTo("chat")}
          >
            <span className="feature-icon">💬</span>
            <h3>AI Chat Assistant</h3>
            <p>
              Ask questions, understand difficult concepts, and get learning
              support.
            </p>
            <span className="feature-link">Start chatting →</span>
          </button>

          <button
            type="button"
            className="feature-card feature-quiz"
            onClick={() => goTo("quiz")}
          >
            <span className="feature-icon">📝</span>
            <h3>Quiz Generator</h3>
            <p>
              Create topic-based quizzes and check your knowledge with
              instant scoring.
            </p>
            <span className="feature-link">Practice now →</span>
          </button>

          <button
            type="button"
            className="feature-card feature-plan"
            onClick={() => goTo("study-plan")}
          >
            <span className="feature-icon">📅</span>
            <h3>Study Planner</h3>
            <p>
              Organize your learning with a study plan tailored to your
              subject and timeline.
            </p>
            <span className="feature-link">Plan your studies →</span>
          </button>

          <button
            type="button"
            className="feature-card feature-pdf"
            onClick={() => goTo("pdf")}
          >
            <span className="feature-icon">📚</span>
            <h3>PDF Learning Assistant</h3>
            <p>
              Upload your PDF learning materials and view the backend
              processing result.
            </p>
            <span className="feature-link">Explore materials →</span>
          </button>
        </div>
      </section>

      <section className="learning-banner">
        <div>
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h2>Small steps. Big progress.</h2>
          <p>Choose a tool and start learning at your own pace.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => goTo("chat")}
        >
          Let's Begin →
        </button>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">🤖 PADDIPS BOT</div>
        <p>AI Learning Assistant</p>
        <p>Learn something new every day.</p>
        <span>© {new Date().getFullYear()} PADDIPS BOT</span>
      </footer>
    </main>
  );
}
  
