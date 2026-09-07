import { useEffect, useState } from "react";
import "./App.css";
import Chat from "./Chat";

function App() {
  // =====================================================
  // INTRO
  // =====================================================

  const [stage, setStage] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(2), 1800);
    const t2 = setTimeout(() => setStage(3), 3600);
    const t3 = setTimeout(() => setStage(4), 5000);
    const t4 = setTimeout(() => setStage(5), 6500);
    const t5 = setTimeout(() => setStage(6), 8500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  // =====================================================
  // PAGE
  // =====================================================

  const [page, setPage] = useState("home");

  // =====================================================
  // QUIZ
  // =====================================================

  const [topic, setTopic] = useState("");
  const [quizCount, setQuizCount] = useState(5);

  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [score, setScore] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // =====================================================
  // STUDY PLAN
  // =====================================================

  const [subject, setSubject] = useState("");
  const [days, setDays] = useState("");
  const [studyPlan, setStudyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // =====================================================
  // PDF
  // =====================================================

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfError, setPdfError] = useState("");

  // =====================================================
  // GENERATE QUIZ
  // =====================================================

  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuizError("");
    setQuiz([]);
    setSelectedAnswers({});
    setScore(null);
    setQuizSubmitted(false);

    try {
      const response = await fetch("http://localhost:5000/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim() || "Computer Science",
          count: Number(quizCount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Quiz generation failed");
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid quiz received from backend");
      }

      // Keep the requested number
      const generatedQuestions = data.questions.slice(
        0,
        Number(quizCount)
      );

      setQuiz(generatedQuestions);
    } catch (error) {
      console.error("Quiz Error:", error);

      setQuizError(
        "❌ Quiz generation failed. Please check that the backend is running."
      );
    } finally {
      setQuizLoading(false);
    }
  };

  // =====================================================
  // SELECT ANSWER
  // =====================================================

  const selectAnswer = (questionIndex, answer) => {
    if (quizSubmitted) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));
  };

  // =====================================================
  // GET CORRECT ANSWER
  // =====================================================

  const getCorrectAnswer = (question) => {
    return question.answer || question.correctAnswer;
  };

  // =====================================================
  // SUBMIT QUIZ
  // =====================================================

  const submitQuiz = () => {
    if (quiz.length === 0) return;

    let totalScore = 0;

    quiz.forEach((question, index) => {
      const correctAnswer = getCorrectAnswer(question);
      const userAnswer = selectedAnswers[index];

      if (userAnswer === correctAnswer) {
        totalScore++;
      }
    });

    setScore(totalScore);
    setQuizSubmitted(true);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  };

  // =====================================================
  // RESET QUIZ
  // =====================================================

  const resetQuiz = () => {
    setQuiz([]);
    setSelectedAnswers({});
    setScore(null);
    setQuizSubmitted(false);
    setQuizError("");
  };

  // =====================================================
  // STUDY PLAN
  // =====================================================

  const generateStudyPlan = async () => {
    setPlanError("");
    setStudyPlan("");

    if (!subject.trim()) {
      setPlanError("❌ Please enter a subject.");
      return;
    }

    if (!days || Number(days) <= 0) {
      setPlanError("❌ Please enter a valid number of days.");
      return;
    }

    setPlanLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/study-plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: subject.trim(),
            days: Number(days),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Study plan generation failed"
        );
      }

      setStudyPlan(data.plan);
    } catch (error) {
      console.error("Study Plan Error:", error);

      setPlanError(
        "❌ Study plan generation failed. Please check that the backend is running."
      );
    } finally {
      setPlanLoading(false);
    }
  };

  // =====================================================
  // SELECT PDF
  // =====================================================

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    setPdfError("");
    setPdfData(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setPdfError("❌ Please select a PDF file only.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setPdfError("❌ PDF size must be less than 10 MB.");
      return;
    }

    setSelectedFile(file);
  };

  // =====================================================
  // UPLOAD PDF
  // =====================================================

  const uploadMaterial = async () => {
    if (!selectedFile) {
      setPdfError("❌ Please choose a PDF file first.");
      return;
    }

    setUploadLoading(true);
    setPdfError("");
    setPdfData(null);

    try {
      const formData = new FormData();

      formData.append("material", selectedFile);

      const response = await fetch(
        "http://localhost:5000/api/upload-material",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF upload failed");
      }

      setPdfData(data);
    } catch (error) {
      console.error("PDF Upload Error:", error);

      setPdfError(
        "❌ PDF upload failed. Please check that the backend is running."
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // =====================================================
  // INTRO ANIMATION
  // =====================================================

  if (stage < 6) {
    return (
      <>
        <div className="splash">
          <div className="stars">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="star"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>

          <div className="background-glow" />

          <div className="orb orb1" />
          <div className="orb orb2" />

          {/* PADDIPS */}
          <img
            src="/paddips.png"
            alt="Paddips"
            className={`side-image paddips ${
              stage >= 3 ? "paddips-center" : ""
            } ${stage >= 4 ? "hide" : ""}`}
          />

          {/* BOT */}
          <img
            src="/bot.png"
            alt="Bot"
            className={`side-image bot ${
              stage >= 3 ? "bot-center" : ""
            } ${stage >= 4 ? "hide" : ""}`}
          />

          {/* ENERGY */}
          {stage >= 3 && stage < 5 && (
            <>
              <div className="energy energy-left" />
              <div className="energy energy-right" />
              <div className="center-energy" />
            </>
          )}

          {/* EXPLOSION */}
          {stage === 4 && (
            <div className="explosion">
              <div className="explosion-core" />

              <div className="ring ring1" />
              <div className="ring ring2" />
              <div className="ring ring3" />

              {Array.from({ length: 45 }).map((_, i) => (
                <span
                  key={i}
                  className="particle"
                  style={{
                    "--angle": `${i * 8.1}deg`,
                    "--distance": `${120 + Math.random() * 260}px`,
                    animationDelay: `${Math.random() * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* FINAL LOGO */}
          {stage >= 5 && (
            <div className="final-logo">
              <div className="logo-glow" />

              <img
                src="/paddips-bot.png"
                alt="Paddips Bot"
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
        </div>

        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
          }

          .splash {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100vh;
            overflow: hidden;

            display: flex;
            align-items: center;
            justify-content: center;

            background:
              radial-gradient(circle at center,
                #5b21b6 0%,
                #302080 25%,
                #17134d 48%,
                #09072b 75%,
                #02020d 100%);

            z-index: 9999;
          }

          .background-glow {
            position: absolute;
            width: 700px;
            height: 700px;
            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                rgba(167,139,250,.34),
                rgba(99,102,241,.20),
                transparent 70%
              );

            filter: blur(20px);
            animation: bgPulse 3s infinite;
          }

          @keyframes bgPulse {
            0%,100% {
              transform: scale(.8);
              opacity: .5;
            }

            50% {
              transform: scale(1.25);
              opacity: 1;
            }
          }

          .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(8px);
            opacity: .5;
          }

          .orb1 {
            width: 150px;
            height: 150px;
            left: 8%;
            top: 18%;
            background: #7c3aed;
            animation: orbFloat 5s infinite ease-in-out;
          }

          .orb2 {
            width: 190px;
            height: 190px;
            right: 6%;
            bottom: 12%;
            background: #4f46e5;
            animation: orbFloat 6s infinite ease-in-out reverse;
          }

          @keyframes orbFloat {
            0%,100% {
              transform: translateY(0) scale(1);
            }

            50% {
              transform: translateY(-30px) scale(1.15);
            }
          }

          .stars {
            position: absolute;
            inset: 0;
          }

          .star {
            position: absolute;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 10px white;
            animation: starBlink 2s infinite;
          }

          @keyframes starBlink {
            0%,100% {
              opacity: .2;
            }

            50% {
              opacity: 1;
            }
          }

          .side-image {
            position: absolute;
            width: 280px;
            height: 280px;
            object-fit: contain;
            top: 50%;
            z-index: 10;

            filter:
              drop-shadow(0 0 15px #8b5cf6)
              drop-shadow(0 0 40px rgba(139,92,246,.6));
          }

          .paddips {
            right: -350px;
            transform: translateY(-50%);

            animation:
              paddipsIn 1.8s ease-out forwards;
          }

          @keyframes paddipsIn {
            0% {
              right: -350px;
              opacity: 0;

              transform:
                translateY(-50%)
                scale(.6)
                rotate(10deg);
            }

            70% {
              opacity: 1;
            }

            100% {
              right: 12%;
              opacity: 1;

              transform:
                translateY(-50%)
                scale(1)
                rotate(0);
            }
          }

          .bot {
            left: -350px;
            transform: translateY(-50%);
            opacity: 0;

            animation:
              botIn 1.8s ease-out 1.8s forwards;
          }

          @keyframes botIn {
            0% {
              left: -350px;
              opacity: 0;

              transform:
                translateY(-50%)
                scale(.6)
                rotate(-10deg);
            }

            20% {
              opacity: 1;
            }

            100% {
              left: 12%;
              opacity: 1;

              transform:
                translateY(-50%)
                scale(1)
                rotate(0);
            }
          }

          .paddips-center {
            animation:
              paddipsMove 1.4s ease-in-out forwards;
          }

          .bot-center {
            animation:
              botMove 1.4s ease-in-out forwards;
          }

          @keyframes paddipsMove {
            0% {
              right: 12%;

              transform:
                translateY(-50%)
                scale(1);
            }

            100% {
              right: 50%;
              margin-right: -140px;

              transform:
                translateY(-50%)
                scale(1.08);
            }
          }

          @keyframes botMove {
            0% {
              left: 12%;

              transform:
                translateY(-50%)
                scale(1);
            }

            100% {
              left: 50%;
              margin-left: -140px;

              transform:
                translateY(-50%)
                scale(1.08);
            }
          }

          .hide {
            opacity: 0 !important;
          }

          .energy {
            position: absolute;
            top: 50%;
            width: 45%;
            height: 5px;

            transform: translateY(-50%);

            background:
              linear-gradient(
                90deg,
                transparent,
                #8b5cf6,
                white,
                #a78bfa,
                transparent
              );

            box-shadow:
              0 0 10px #8b5cf6,
              0 0 30px #8b5cf6,
              0 0 60px #6366f1;

            z-index: 5;

            animation:
              energy .4s infinite alternate;
          }

          .energy-left {
            left: 0;
          }

          .energy-right {
            right: 0;
          }

          @keyframes energy {
            from {
              opacity: .4;

              transform:
                translateY(-50%)
                scaleY(.6);
            }

            to {
              opacity: 1;

              transform:
                translateY(-50%)
                scaleY(1.5);
            }
          }

          .center-energy {
            position: absolute;
            width: 110px;
            height: 110px;
            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                white,
                #a78bfa 20%,
                rgba(139,92,246,.3) 50%,
                transparent 70%
              );

            box-shadow:
              0 0 30px white,
              0 0 80px #8b5cf6,
              0 0 130px #6366f1;

            z-index: 20;

            animation:
              centerPulse .5s infinite alternate;
          }

          @keyframes centerPulse {
            from {
              transform: scale(.6);
            }

            to {
              transform: scale(1.4);
            }
          }

          .explosion {
            position: absolute;
            width: 300px;
            height: 300px;
            top: 50%;
            left: 50%;

            transform:
              translate(-50%, -50%);

            z-index: 100;
          }

          .explosion-core {
            position: absolute;
            width: 100px;
            height: 100px;
            top: 50%;
            left: 50%;

            transform:
              translate(-50%, -50%);

            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                white 0%,
                white 10%,
                #a78bfa 30%,
                #6366f1 55%,
                transparent 75%
              );

            box-shadow:
              0 0 30px white,
              0 0 80px #8b5cf6,
              0 0 150px #6366f1;

            animation:
              explode .9s forwards;
          }

          @keyframes explode {
            0% {
              transform:
                translate(-50%, -50%)
                scale(.2);

              opacity: 1;
            }

            40% {
              transform:
                translate(-50%, -50%)
                scale(2);
            }

            100% {
              transform:
                translate(-50%, -50%)
                scale(5);

              opacity: 0;
            }
          }

          .ring {
            position: absolute;
            top: 50%;
            left: 50%;

            width: 70px;
            height: 70px;

            border: 4px solid #a78bfa;
            border-radius: 50%;

            transform:
              translate(-50%, -50%)
              scale(0);

            box-shadow:
              0 0 25px #8b5cf6;

            animation:
              ringExpand 1.2s ease-out forwards;
          }

          .ring2 {
            animation-delay: .15s;
          }

          .ring3 {
            animation-delay: .3s;
          }

          @keyframes ringExpand {
            0% {
              transform:
                translate(-50%, -50%)
                scale(0);

              opacity: 1;
            }

            100% {
              transform:
                translate(-50%, -50%)
                scale(7);

              opacity: 0;
            }
          }

          .particle {
            position: absolute;
            top: 50%;
            left: 50%;

            width: 7px;
            height: 7px;

            border-radius: 50%;

            background: white;

            box-shadow:
              0 0 12px #8b5cf6;

            animation:
              particleBlast 1.2s ease-out forwards;
          }

          @keyframes particleBlast {
            0% {
              transform:
                translate(-50%, -50%)
                rotate(var(--angle))
                translateX(0);

              opacity: 1;
            }

            100% {
              transform:
                translate(-50%, -50%)
                rotate(var(--angle))
                translateX(var(--distance));

              opacity: 0;
            }
          }

          .final-logo {
            position: absolute;
            top: 50%;
            left: 50%;

            transform:
              translate(-50%, -50%);

            display: flex;
            flex-direction: column;
            align-items: center;

            z-index: 200;

            animation:
              logoAppear 1.3s ease-out forwards;
          }

          .final-logo img {
            width: 210px;
            max-width: 45vw;
            object-fit: contain;
            position: relative;
            z-index: 2;

            filter:
              drop-shadow(0 0 10px #8b5cf6)
              drop-shadow(0 0 25px #8b5cf6)
              drop-shadow(0 0 45px rgba(99,102,241,.7));

            animation:
              logoFloat 2s infinite alternate;
          }

          @keyframes logoAppear {
            0% {
              opacity: 0;

              transform:
                translate(-50%, -50%)
                scale(.2)
                rotate(-10deg);
            }

            60% {
              opacity: 1;

              transform:
                translate(-50%, -50%)
                scale(1.1);
            }

            100% {
              opacity: 1;

              transform:
                translate(-50%, -50%)
                scale(1);
            }
          }

          @keyframes logoFloat {
            from {
              transform: translateY(0);
            }

            to {
              transform: translateY(-7px);
            }
          }

          .logo-glow {
            position: absolute;
            width: 260px;
            height: 260px;

            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                rgba(139,92,246,.35),
                transparent 65%
              );

            filter: blur(20px);

            animation:
              glow 2s infinite alternate;
          }

          @keyframes glow {
            from {
              transform: scale(.8);
              opacity: .5;
            }

            to {
              transform: scale(1.2);
              opacity: 1;
            }
          }

          .final-logo h3 {
            margin: 10px 0 0;

            color: white;

            font-size: 12px;

            letter-spacing: 4px;

            text-shadow:
              0 0 10px #8b5cf6,
              0 0 20px #6366f1;
          }

          .ready-line {
            margin-top: 8px;

            font-size: 9px;
            letter-spacing: 3px;

            color: #ddd6fe;

            opacity: .8;
          }

          .status {
            position: absolute;
            bottom: 55px;
            left: 50%;

            transform:
              translateX(-50%);

            color: #ddd6fe;

            font-size: 14px;

            font-weight: bold;

            letter-spacing: 5px;

            z-index: 300;

            animation:
              statusBlink 1s infinite;
          }

          @keyframes statusBlink {
            0%,100% {
              opacity: .4;
            }

            50% {
              opacity: 1;
            }
          }

          @media (max-width: 768px) {
            .side-image {
              width: 180px;
              height: 180px;
            }

            .paddips {
              right: -230px;
            }

            .bot {
              left: -230px;
            }

            .final-logo img {
              width: 140px;
            }

            .logo-glow {
              width: 180px;
              height: 180px;
            }

            .final-logo h3 {
              font-size: 8px;
              letter-spacing: 2.5px;
            }

            .ready-line {
              font-size: 7px;
              letter-spacing: 2px;
            }

            .status {
              bottom: 30px;
              font-size: 10px;
              letter-spacing: 3px;
            }
          }
        `}</style>
      </>
    );
  }

  // =====================================================
  // CHAT PAGE
  // =====================================================

  if (page === "chat") {
    return (
      <div style={styles.pageContainer}>
        <button
          onClick={() => setPage("home")}
          style={styles.backButton}
        >
          ← Back to Home
        </button>

        <div style={styles.pageHero}>
          <div style={styles.heroIcon}>🤖</div>

          <h1 style={styles.pageTitle}>
            AI Study Chat
          </h1>

          <p style={styles.pageDescription}>
            Ask anything and learn with PADDIPS BOT
          </p>
        </div>

        <Chat />
      </div>
    );
  }

  // =====================================================
  // STUDY MATERIAL
  // =====================================================

  if (page === "material") {
    return (
      <div style={styles.pageContainer}>
        <button
          onClick={() => setPage("home")}
          style={styles.backButton}
        >
          ← Back to Home
        </button>

        <div style={styles.pageHero}>
          <div style={styles.heroIcon}>📚</div>

          <h1 style={styles.pageTitle}>
            Study Material
          </h1>

          <p style={styles.pageDescription}>
            Upload your PDF and let PADDIPS BOT read your
            study material.
          </p>
        </div>

        <div style={styles.uploadBox}>
          <div style={styles.uploadIcon}>📄</div>

          <h2 style={styles.sectionTitle}>
            Upload Study Material
          </h2>

          <p style={styles.mutedText}>
            Select your syllabus, notes, or textbook PDF.
          </p>

          <label style={styles.fileDrop}>
            <span style={styles.fileDropIcon}>☁️</span>

            <strong>
              Click to choose your PDF
            </strong>

            <small>
              PDF only • Maximum 10 MB
            </small>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              style={styles.hiddenInput}
            />
          </label>

          {selectedFile && (
            <div style={styles.fileInfo}>
              <div style={styles.fileIcon}>📄</div>

              <div style={{ flex: 1 }}>
                <strong>{selectedFile.name}</strong>

                <p>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}
                  {" "}MB
                </p>
              </div>

              <span style={styles.fileReady}>
                ✓ Ready
              </span>
            </div>
          )}

          <button
            onClick={uploadMaterial}
            disabled={uploadLoading || !selectedFile}
            style={{
              ...styles.primaryButton,
              width: "100%",
              marginTop: "20px",
              opacity:
                uploadLoading || !selectedFile ? 0.6 : 1,
            }}
          >
            {uploadLoading
              ? "⏳ Uploading & Reading..."
              : "📤 Upload PDF"}
          </button>
        </div>

        {pdfError && (
          <div style={styles.errorBox}>
            {pdfError}
          </div>
        )}

        {pdfData && (
          <div style={styles.resultBox}>
            <div style={styles.successHeader}>
              <div style={styles.successIcon}>✓</div>

              <div>
                <h2>PDF Uploaded Successfully!</h2>

                <p>
                  PADDIPS BOT has extracted your study
                  material.
                </p>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <span>📄</span>
                <small>File</small>
                <strong>{pdfData.filename}</strong>
              </div>

              <div style={styles.infoCard}>
                <span>📑</span>
                <small>Pages</small>
                <strong>{pdfData.pages}</strong>
              </div>

              <div style={styles.infoCard}>
                <span>🔤</span>
                <small>Characters</small>
                <strong>
                  {pdfData.text.length}
                </strong>
              </div>
            </div>

            <div style={styles.contentHeader}>
              <span>📖</span>
              <h2>Extracted PDF Content</h2>
            </div>

            <div style={styles.pdfText}>
              {pdfData.text}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =====================================================
  // QUIZ PAGE
  // =====================================================

  if (page === "quiz") {
    return (
      <div style={styles.quizPage}>
        <button
          onClick={() => setPage("home")}
          style={styles.backButton}
        >
          ← Back to Home
        </button>

        <div style={styles.pageHero}>
          <div style={styles.heroIcon}>🧠</div>

          <h1 style={styles.pageTitle}>
            AI Quiz Arena
          </h1>

          <p style={styles.pageDescription}>
            Challenge yourself and test your knowledge.
          </p>
        </div>

        {/* QUIZ SETUP */}
        {!quizSubmitted && (
          <div style={styles.quizSetup}>
            <div style={styles.setupTitle}>
              <span>✨</span>
              <div>
                <h2>Create Your Quiz</h2>
                <p>
                  Choose a topic and number of questions.
                </p>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                📚 Quiz Topic
              </label>

              <input
                type="text"
                value={topic}
                onChange={(e) =>
                  setTopic(e.target.value)
                }
                placeholder="Example: JavaScript, Python, DBMS..."
                style={styles.fullInput}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                🔢 Number of Questions
              </label>

              <div style={styles.countGrid}>
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuizCount(count)}
                    style={{
                      ...styles.countButton,
                      ...(quizCount === count
                        ? styles.countButtonActive
                        : {}),
                    }}
                  >
                    <strong>{count}</strong>
                    <span>Questions</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.selectedCount}>
              <span>🎯 Selected Quiz</span>
              <strong>{quizCount} Questions</strong>
            </div>

            <button
              onClick={generateQuiz}
              disabled={quizLoading}
              style={{
                ...styles.primaryButton,
                width: "100%",
                marginTop: "18px",
                opacity: quizLoading ? 0.6 : 1,
              }}
            >
              {quizLoading
                ? "⏳ Generating Your Quiz..."
                : `🚀 Generate ${quizCount} Questions`}
            </button>
          </div>
        )}

        {/* ERROR */}
        {quizError && (
          <div style={styles.errorBox}>
            {quizError}
          </div>
        )}

        {/* QUIZ */}
        {quiz.length > 0 && !quizSubmitted && (
          <div>
            <div style={styles.quizProgress}>
              <div>
                <span>📝</span>
                <strong>
                  {quiz.length} Questions
                </strong>
              </div>

              <div>
                <span>✅</span>
                <strong>
                  {Object.keys(selectedAnswers).length}
                </strong>
                <span>/{quiz.length} Answered</span>
              </div>
            </div>

            {quiz.map((question, index) => (
              <div
                key={index}
                style={styles.questionCard}
              >
                <div style={styles.questionTop}>
                  <span style={styles.questionNumber}>
                    Q{index + 1}
                  </span>

                  <span style={styles.questionCount}>
                    Question {index + 1} of {quiz.length}
                  </span>
                </div>

                <h3 style={styles.questionTitle}>
                  {question.question}
                </h3>

                <div>
                  {question.options.map(
                    (option, optionIndex) => {
                      const optionText =
                        typeof option === "string"
                          ? option
                          : option.text ||
                            option.label ||
                            option.value;

                      const isSelected =
                        selectedAnswers[index] ===
                        optionText;

                      return (
                        <label
                          key={optionIndex}
                          style={{
                            ...styles.option,
                            ...(isSelected
                              ? styles.optionSelected
                              : {}),
                          }}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={optionText}
                            checked={isSelected}
                            onChange={() =>
                              selectAnswer(
                                index,
                                optionText
                              )
                            }
                          />

                          <span
                            style={{
                              ...styles.optionLetter,
                              ...(isSelected
                                ? styles.optionLetterSelected
                                : {}),
                            }}
                          >
                            {String.fromCharCode(
                              65 + optionIndex
                            )}
                          </span>

                          <span style={styles.optionText}>
                            {optionText}
                          </span>

                          {isSelected && (
                            <span style={styles.selectedCheck}>
                              ✓
                            </span>
                          )}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={submitQuiz}
              style={{
                ...styles.primaryButton,
                display: "block",
                margin: "30px auto",
                minWidth: "240px",
                fontSize: "16px",
              }}
            >
              ✅ Submit Quiz
            </button>
          </div>
        )}

        {/* RESULT */}
        {quizSubmitted && score !== null && (
          <>
            <div style={styles.scoreBox}>
              <div style={styles.resultGlow} />

              <div style={styles.resultEmoji}>
                {score === quiz.length
                  ? "🏆"
                  : score >= quiz.length * 0.7
                  ? "🎉"
                  : score >= quiz.length * 0.5
                  ? "👍"
                  : "📚"}
              </div>

              <span style={styles.completedBadge}>
                QUIZ COMPLETED
              </span>

              <h2>Great Work! 🎓</h2>

              <div style={styles.scoreNumber}>
                {score}
                <span>/{quiz.length}</span>
              </div>

              <div style={styles.percentage}>
                {Math.round(
                  (score / quiz.length) * 100
                )}
                %
              </div>

              <p style={styles.scoreMessage}>
                {score === quiz.length
                  ? "Perfect score! You mastered this topic. 🚀"
                  : score >= quiz.length * 0.7
                  ? "Excellent performance! Keep it up. 🌟"
                  : score >= quiz.length * 0.5
                  ? "Good effort! A little more practice will help. 💪"
                  : "Don't give up. Keep learning and try again! 📚"}
              </p>

              <button
                onClick={resetQuiz}
                style={styles.newQuizButton}
              >
                🔄 Start New Quiz
              </button>
            </div>

            {/* REVIEW */}
            <div style={styles.reviewContainer}>
              <div style={styles.reviewHeading}>
                <div>
                  <span>📋</span>
                  <h2>Answer Review</h2>
                </div>

                <p>
                  See which answers were right or wrong.
                </p>
              </div>

              {quiz.map((question, index) => {
                const userAnswer =
                  selectedAnswers[index];

                const correctAnswer =
                  getCorrectAnswer(question);

                const isCorrect =
                  userAnswer === correctAnswer;

                return (
                  <div
                    key={index}
                    style={{
                      ...styles.reviewCard,
                      borderLeft: isCorrect
                        ? "6px solid #22c55e"
                        : "6px solid #ef4444",
                    }}
                  >
                    <div style={styles.reviewTop}>
                      <span
                        style={
                          styles.reviewQuestionNumber
                        }
                      >
                        Question {index + 1}
                      </span>

                      {isCorrect ? (
                        <span
                          style={styles.correctBadge}
                        >
                          ✓ Correct
                        </span>
                      ) : (
                        <span
                          style={styles.wrongBadge}
                        >
                          ✕ Wrong
                        </span>
                      )}
                    </div>

                    <h3 style={styles.reviewQuestion}>
                      {question.question}
                    </h3>

                    <div
                      style={{
                        ...styles.answerBox,
                        background: isCorrect
                          ? "#f0fdf4"
                          : "#fef2f2",
                      }}
                    >
                      <strong>Your Answer:</strong>

                      <span
                        style={{
                          color: isCorrect
                            ? "#16a34a"
                            : "#dc2626",
                          fontWeight: "800",
                        }}
                      >
                        {userAnswer || "Not Answered"}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div
                        style={
                          styles.correctAnswerBox
                        }
                      >
                        <strong>
                          ✓ Correct Answer:
                        </strong>

                        <span>
                          {correctAnswer}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        ...styles.resultMessage,
                        background: isCorrect
                          ? "#f0fdf4"
                          : "#fff7ed",
                        color: isCorrect
                          ? "#15803d"
                          : "#c2410c",
                      }}
                    >
                      {isCorrect
                        ? "🎉 Excellent! Your answer is correct."
                        : "💡 Review this question and learn the correct answer."}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // =====================================================
  // STUDY PLAN PAGE
  // =====================================================

  if (page === "plan") {
    return (
      <div style={styles.pageContainer}>
        <button
          onClick={() => setPage("home")}
          style={styles.backButton}
        >
          ← Back to Home
        </button>

        <div style={styles.pageHero}>
          <div style={styles.heroIcon}>📅</div>

          <h1 style={styles.pageTitle}>
            AI Study Planner
          </h1>

          <p style={styles.pageDescription}>
            Build a personalized learning schedule with AI.
          </p>
        </div>

        <div style={styles.planCard}>
          <div style={styles.setupTitle}>
            <span>🚀</span>

            <div>
              <h2>Build Your Plan</h2>

              <p>
                Tell PADDIPS BOT what you want to study.
              </p>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              📚 Subject
            </label>

            <input
              type="text"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
              placeholder="Example: JavaScript"
              style={styles.fullInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              📅 Number of Days
            </label>

            <input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) =>
                setDays(e.target.value)
              }
              placeholder="Example: 5"
              style={styles.fullInput}
            />
          </div>

          <button
            onClick={generateStudyPlan}
            disabled={planLoading}
            style={{
              ...styles.primaryButton,
              width: "100%",
              marginTop: "25px",
              opacity: planLoading ? 0.6 : 1,
            }}
          >
            {planLoading
              ? "⏳ Creating Your Plan..."
              : "🤖 Generate Study Plan"}
          </button>
        </div>

        {planError && (
          <div style={styles.errorBox}>
            {planError}
          </div>
        )}

        {studyPlan && (
          <div style={styles.resultBox}>
            <div style={styles.successHeader}>
              <div style={styles.successIcon}>
                ✓
              </div>

              <div>
                <h2>Your Personalized Study Plan</h2>

                <p>
                  Follow this schedule and stay consistent.
                </p>
              </div>
            </div>

            <div style={styles.planText}>
              {studyPlan}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =====================================================
  // HOME PAGE
  // =====================================================

  return (
    <div className="app">
      <style>{`
        .app {
          min-height: 100vh;
          color: #30205f;

          background:
            radial-gradient(
              circle at top left,
              rgba(124,58,237,.24),
              transparent 30%
            ),
            radial-gradient(
              circle at top right,
              rgba(79,70,229,.18),
              transparent 28%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(168,85,247,.13),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #f8f6ff 0%,
              #eee9ff 45%,
              #faf9ff 100%
            );
        }

        .app * {
          box-sizing: border-box;
        }

        .navbar {
          min-height: 76px;

          padding: 14px 6%;

          display: flex;
          align-items: center;
          justify-content: space-between;

          background: rgba(255,255,255,.88);

          border-bottom:
            1px solid rgba(139,92,246,.16);

          box-shadow:
            0 10px 35px rgba(60,42,120,.10);

          backdrop-filter: blur(18px);

          position: sticky;
          top: 0;

          z-index: 50;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          width: 46px;
          height: 46px;

          display: grid;
          place-items: center;

          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #6366f1
            );

          color: white;
          font-size: 22px;

          box-shadow:
            0 8px 25px rgba(91,60,196,.30);
        }

        .navbar h2 {
          margin: 0;

          color: #5232b0;

          font-size: 23px;

          font-weight: 900;
          letter-spacing: -.4px;
        }

        .navbar small {
          display: block;

          color: #81769c;
          font-size: 11px;
          margin-top: 2px;
        }

        .profile-btn {
          border: none;

          padding: 11px 20px;

          border-radius: 999px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #5b3cc4
            );

          box-shadow:
            0 8px 22px rgba(91,60,196,.25);

          font-weight: 800;

          cursor: pointer;
        }

        .container {
          width: min(1150px, 92%);

          margin: auto;

          padding: 55px 0 80px;
        }

        .welcome {
          position: relative;
          overflow: hidden;

          text-align: center;

          padding: 65px 25px;

          border-radius: 32px;

          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.97),
              rgba(240,234,255,.95)
            );

          border:
            1px solid rgba(139,92,246,.17);

          box-shadow:
            0 20px 60px rgba(65,45,130,.13);
        }

        .welcome::before {
          content: "";

          position: absolute;

          width: 280px;
          height: 280px;

          border-radius: 50%;

          top: -150px;
          right: -90px;

          background:
            radial-gradient(
              circle,
              rgba(124,58,237,.23),
              transparent 70%
            );
        }

        .welcome::after {
          content: "";

          position: absolute;

          width: 220px;
          height: 220px;

          border-radius: 50%;

          bottom: -130px;
          left: -70px;

          background:
            radial-gradient(
              circle,
              rgba(99,102,241,.18),
              transparent 70%
            );
        }

        .welcome-content {
          position: relative;
          z-index: 2;
        }

        .welcome-badge {
          display: inline-flex;

          align-items: center;
          gap: 8px;

          padding: 8px 14px;

          border-radius: 999px;

          background: #eee8ff;

          color: #663db5;

          font-weight: 800;
          font-size: 13px;

          margin-bottom: 18px;
        }

        .welcome h1 {
          margin: 0 auto 14px;

          max-width: 850px;

          font-size:
            clamp(34px,5vw,56px);

          line-height: 1.08;

          color: #34206d;

          letter-spacing: -1.2px;
        }

        .welcome h1 span {
          background:
            linear-gradient(
              90deg,
              #7c3aed,
              #4f46e5,
              #9333ea
            );

          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome p {
          margin: 0 auto;

          max-width: 720px;

          color: #6b6480;

          font-size: 17px;

          line-height: 1.75;
        }

        .home-stats {
          display: grid;

          grid-template-columns:
            repeat(3,1fr);

          gap: 18px;

          margin-top: 24px;
        }

        .mini-stat {
          padding: 19px;

          border-radius: 18px;

          background:
            rgba(255,255,255,.82);

          border:
            1px solid rgba(139,92,246,.12);

          box-shadow:
            0 10px 30px rgba(65,45,130,.07);
        }

        .mini-stat strong {
          display: block;

          font-size: 25px;

          color: #5b3cc4;

          margin-bottom: 4px;
        }

        .mini-stat span {
          color: #81769c;
          font-size: 13px;
          font-weight: 700;
        }

        .cards {
          display: grid;

          grid-template-columns:
            repeat(4,1fr);

          gap: 22px;

          margin-top: 30px;
        }

        .card {
          position: relative;
          overflow: hidden;

          padding: 27px 22px 22px;

          border-radius: 24px;

          background:
            linear-gradient(
              160deg,
              rgba(255,255,255,.98),
              rgba(248,246,255,.98)
            );

          border:
            1px solid rgba(139,92,246,.14);

          box-shadow:
            0 13px 38px rgba(65,45,130,.09);

          transition:
            transform .25s ease,
            box-shadow .25s ease;
        }

        .card:hover {
          transform: translateY(-8px);

          box-shadow:
            0 22px 50px
            rgba(91,60,196,.17);
        }

        .card::before {
          content: "";

          position: absolute;

          left: 0;
          top: 0;

          width: 100%;
          height: 5px;

          background:
            linear-gradient(
              90deg,
              #7c3aed,
              #6366f1,
              #a855f7
            );
        }

        .card::after {
          content: "";

          position: absolute;

          width: 110px;
          height: 110px;

          border-radius: 50%;

          right: -45px;
          bottom: -48px;

          background:
            radial-gradient(
              circle,
              rgba(124,58,237,.14),
              transparent 70%
            );
        }

        .card .icon {
          width: 62px;
          height: 62px;

          display: grid;
          place-items: center;

          border-radius: 18px;

          background:
            linear-gradient(
              135deg,
              #eee8ff,
              #e6e0ff
            );

          font-size: 29px;

          margin-bottom: 18px;

          box-shadow:
            inset 0 0 0 1px
            rgba(139,92,246,.08);
        }

        .card h3 {
          margin: 0 0 10px;

          color: #3b2675;

          font-size: 21px;
        }

        .card p {
          min-height: 86px;

          margin: 0 0 18px;

          color: #716a83;

          line-height: 1.6;

          font-size: 14px;
        }

        .card button {
          position: relative;
          z-index: 2;

          width: 100%;

          padding: 12px 15px;

          border: none;

          border-radius: 12px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #5b3cc4
            );

          cursor: pointer;

          font-size: 14px;

          font-weight: 800;

          box-shadow:
            0 8px 20px
            rgba(91,60,196,.20);

          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .card button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 12px 25px
            rgba(91,60,196,.28);
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns:
              repeat(2,1fr);
          }

          .home-stats {
            grid-template-columns:
              repeat(3,1fr);
          }
        }

        @media (max-width: 600px) {
          .navbar h2 {
            font-size: 18px;
          }

          .navbar small {
            display: none;
          }

          .container {
            width: 94%;
            padding-top: 28px;
          }

          .welcome {
            padding: 40px 18px;
          }

          .cards {
            grid-template-columns: 1fr;
          }

          .home-stats {
            grid-template-columns: 1fr;
          }

          .card p {
            min-height: auto;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="brand-area">
          <div className="brand-logo">
            🤖
          </div>

          <div>
            <h2>PADDIPS BOT</h2>
            <small>AI LEARNING ASSISTANT</small>
          </div>
        </div>

        <button className="profile-btn">
          🎓 Student
        </button>
      </nav>

      <main className="container">
        <section className="welcome">
          <div className="welcome-content">
            <div className="welcome-badge">
              ✨ POWERED BY AI
            </div>

            <h1>
              Welcome to{" "}
              <span>PADDIPS BOT</span> 🤖
            </h1>

            <p>
              Your smart AI learning companion for
              studying, asking questions, generating
              quizzes, reading study materials, and
              building personalized study plans.
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
          {/* ASK AI */}
          <div className="card">
            <div className="icon">
              💬
            </div>

            <h3>Ask AI</h3>

            <p>
              Ask questions and get simple,
              intelligent explanations from your
              AI study assistant.
            </p>

            <button
              onClick={() => setPage("chat")}
            >
              Start Chat →
            </button>
          </div>

          {/* STUDY MATERIAL */}
          <div className="card">
            <div className="icon">
              📚
            </div>

            <h3>Study Material</h3>

            <p>
              Upload your syllabus, notes, or
              textbook PDF and extract useful
              study content.
            </p>

            <button
              onClick={() =>
                setPage("material")
              }
            >
              Upload Material →
            </button>
          </div>

          {/* QUIZ */}
          <div className="card">
            <div className="icon">
              📝
            </div>

            <h3>Take Quiz</h3>

            <p>
              Generate 5, 10, 15, or 20 AI questions
              and see which answers are right or wrong.
            </p>

            <button
              onClick={() => setPage("quiz")}
            >
              Start Quiz →
            </button>
          </div>

          {/* STUDY PLAN */}
          <div className="card">
            <div className="icon">
              📅
            </div>

            <h3>Study Plan</h3>

            <p>
              Create a personalized study schedule
              based on your subject and available days.
            </p>

            <button
              onClick={() => setPage("plan")}
            >
              Create Plan →
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

// =====================================================
// COMMON STYLES
// =====================================================

const styles = {
  pageContainer: {
    minHeight: "100vh",
    padding: "30px 20px 70px",
    maxWidth: "1050px",
    margin: "auto",

    background:
      "radial-gradient(circle at top left,rgba(124,58,237,.15),transparent 30%), radial-gradient(circle at bottom right,rgba(99,102,241,.12),transparent 30%), linear-gradient(135deg,#faf9ff 0%,#f0ebff 50%,#fbfaff 100%)",

    color: "#30205f",
  },

  quizPage: {
    minHeight: "100vh",
    padding: "30px 20px 70px",
    maxWidth: "1050px",
    margin: "auto",

    background:
      "radial-gradient(circle at top left,rgba(124,58,237,.16),transparent 28%), radial-gradient(circle at bottom right,rgba(99,102,241,.12),transparent 30%), linear-gradient(135deg,#faf9ff 0%,#f0ebff 50%,#fbfaff 100%)",

    color: "#30205f",
  },

  pageHero: {
    textAlign: "center",
    padding: "25px 15px 32px",
  },

  heroIcon: {
    width: "76px",
    height: "76px",
    margin: "0 auto 14px",

    display: "grid",
    placeItems: "center",

    borderRadius: "24px",

    background:
      "linear-gradient(135deg,#7c3aed,#6366f1)",

    color: "white",

    fontSize: "36px",

    boxShadow:
      "0 14px 35px rgba(91,60,196,.28)",
  },

  pageTitle: {
    textAlign: "center",
    marginTop: "14px",
    marginBottom: "10px",

    fontSize:
      "clamp(30px,5vw,44px)",

    color: "#3d2478",

    letterSpacing: "-.5px",
  },

  pageDescription: {
    textAlign: "center",

    fontSize: "17px",

    color: "#716a83",

    marginBottom: "12px",

    lineHeight: "1.6",
  },

  backButton: {
    padding: "11px 20px",

    border: "none",

    borderRadius: "12px",

    background:
      "linear-gradient(135deg,#7c3aed,#5b3cc4)",

    color: "white",

    cursor: "pointer",

    fontSize: "14px",

    fontWeight: "800",

    boxShadow:
      "0 8px 20px rgba(91,60,196,.20)",
  },

  primaryButton: {
    padding: "14px 24px",

    border: "none",

    borderRadius: "13px",

    background:
      "linear-gradient(135deg,#7c3aed,#5b3cc4,#6366f1)",

    color: "white",

    cursor: "pointer",

    fontSize: "15px",

    fontWeight: "800",

    boxShadow:
      "0 10px 25px rgba(91,60,196,.22)",
  },

  // ===================================================
  // UPLOAD
  // ===================================================

  uploadBox: {
    marginTop: "10px",

    padding: "35px",

    borderRadius: "25px",

    textAlign: "center",

    background:
      "linear-gradient(145deg,#ffffff,#f4efff)",

    border:
      "1px solid rgba(139,92,246,.17)",

    boxShadow:
      "0 18px 45px rgba(65,45,130,.10)",
  },

  uploadIcon: {
    fontSize: "58px",
    marginBottom: "8px",
  },

  sectionTitle: {
    color: "#3d2478",
    marginBottom: "8px",
  },

  mutedText: {
    color: "#766e86",
    marginBottom: "25px",
  },

  fileDrop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    minHeight: "160px",

    padding: "25px",

    border:
      "2px dashed #a78bfa",

    borderRadius: "18px",

    background:
      "linear-gradient(135deg,#faf8ff,#f1ecff)",

    cursor: "pointer",

    color: "#50369a",
  },

  fileDropIcon: {
    fontSize: "38px",
    marginBottom: "8px",
  },

  hiddenInput: {
    display: "none",
  },

  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "14px",

    marginTop: "20px",
    padding: "15px",

    background: "#eee8ff",

    border:
      "1px solid #ddd1ff",

    borderRadius: "14px",

    textAlign: "left",

    color: "#49357d",
  },

  fileIcon: {
    width: "45px",
    height: "45px",

    display: "grid",
    placeItems: "center",

    borderRadius: "12px",

    background: "white",

    fontSize: "23px",
  },

  fileReady: {
    padding: "6px 10px",

    borderRadius: "20px",

    background: "#dcfce7",

    color: "#15803d",

    fontWeight: "800",

    fontSize: "12px",
  },

  errorBox: {
    marginTop: "20px",

    padding: "15px 18px",

    background:
      "linear-gradient(135deg,#fff1f2,#ffe4e6)",

    color: "#b42345",

    border:
      "1px solid #fecdd3",

    borderRadius: "13px",

    fontWeight: "700",
  },

  resultBox: {
    marginTop: "28px",

    padding: "28px",

    background:
      "linear-gradient(145deg,#ffffff,#f4f0ff)",

    borderRadius: "22px",

    boxShadow:
      "0 15px 40px rgba(65,45,130,.10)",

    border:
      "1px solid rgba(139,92,246,.13)",
  },

  successHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",

    paddingBottom: "20px",

    borderBottom:
      "1px solid #ebe6f7",
  },

  successIcon: {
    width: "48px",
    height: "48px",

    display: "grid",
    placeItems: "center",

    borderRadius: "50%",

    background: "#dcfce7",

    color: "#15803d",

    fontSize: "25px",
    fontWeight: "900",
  },

  infoGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(3,1fr)",

    gap: "15px",

    marginTop: "22px",
  },

  infoCard: {
    display: "flex",

    flexDirection: "column",

    gap: "4px",

    padding: "17px",

    borderRadius: "15px",

    background: "#f8f6ff",

    border:
      "1px solid #ebe4ff",
  },

  contentHeader: {
    display: "flex",
    alignItems: "center",

    gap: "10px",

    marginTop: "28px",
  },

  pdfText: {
    marginTop: "15px",

    padding: "20px",

    background: "#ffffff",

    borderRadius: "14px",

    whiteSpace: "pre-wrap",

    maxHeight: "520px",

    overflowY: "auto",

    textAlign: "left",

    lineHeight: "1.75",

    border:
      "1px solid #e8e1fb",
  },

  // ===================================================
  // QUIZ SETUP
  // ===================================================

  quizSetup: {
    maxWidth: "750px",

    margin: "0 auto 30px",

    padding: "30px",

    borderRadius: "25px",

    background:
      "linear-gradient(145deg,#ffffff,#f3edff)",

    border:
      "1px solid rgba(139,92,246,.18)",

    boxShadow:
      "0 18px 48px rgba(65,45,130,.11)",
  },

  setupTitle: {
    display: "flex",
    gap: "14px",
    alignItems: "center",

    paddingBottom: "18px",

    borderBottom:
      "1px solid #e9e2fa",

    marginBottom: "10px",
  },

  formGroup: {
    marginTop: "22px",
  },

  label: {
    display: "block",

    marginBottom: "9px",

    fontWeight: "800",

    fontSize: "15px",

    color: "#4b367e",
  },

  fullInput: {
    width: "100%",

    padding: "14px 16px",

    borderRadius: "13px",

    border:
      "1px solid #d8cef6",

    outline: "none",

    fontSize: "16px",

    background: "#ffffff",

    color: "#30205f",

    boxSizing: "border-box",
  },

  countGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(4,1fr)",

    gap: "10px",
  },

  countButton: {
    padding: "15px 10px",

    borderRadius: "14px",

    border:
      "1px solid #ddd4f7",

    background: "#ffffff",

    color: "#594d74",

    cursor: "pointer",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    gap: "3px",

    transition: "all .2s ease",
  },

  countButtonActive: {
    background:
      "linear-gradient(135deg,#7c3aed,#6366f1)",

    borderColor: "#7c3aed",

    color: "white",

    transform: "translateY(-2px)",

    boxShadow:
      "0 10px 23px rgba(91,60,196,.24)",
  },

  selectedCount: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: "18px",

    padding: "13px 15px",

    borderRadius: "12px",

    background: "#eee8ff",

    color: "#50369a",

    fontSize: "14px",
  },

  quizProgress: {
    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    maxWidth: "900px",

    margin:
      "0 auto 20px",

    padding: "15px 18px",

    borderRadius: "14px",

    background:
      "linear-gradient(135deg,#eee8ff,#e9e4ff)",

    color: "#50369a",

    fontSize: "14px",

    boxShadow:
      "0 7px 20px rgba(91,60,196,.07)",
  },

  questionCard: {
    maxWidth: "900px",

    margin:
      "0 auto 20px",

    padding: "25px",

    borderRadius: "19px",

    background:
      "linear-gradient(145deg,#ffffff,#fbfaff)",

    border:
      "1px solid rgba(139,92,246,.13)",

    boxShadow:
      "0 10px 32px rgba(65,45,130,.08)",
  },

  questionTop: {
    display: "flex",

    alignItems: "center",

    gap: "10px",

    marginBottom: "14px",
  },

  questionNumber: {
    display: "grid",
    placeItems: "center",

    width: "38px",
    height: "38px",

    borderRadius: "12px",

    background:
      "linear-gradient(135deg,#7c3aed,#6366f1)",

    color: "white",

    fontWeight: "900",
  },

  questionCount: {
    color: "#81769c",
    fontSize: "13px",
    fontWeight: "700",
  },

  questionTitle: {
    color: "#35206e",

    lineHeight: "1.55",

    margin:
      "0 0 18px",

    fontSize: "19px",
  },

  option: {
    display: "flex",

    alignItems: "center",

    gap: "12px",

    padding: "14px 15px",

    marginTop: "10px",

    border:
      "1px solid #e4dfef",

    borderRadius: "13px",

    cursor: "pointer",

    color: "#40356a",

    background: "#ffffff",

    transition:
      "all .2s ease",
  },

  optionSelected: {
    background:
      "linear-gradient(135deg,#f0ebff,#e9e2ff)",

    borderColor: "#8b5cf6",

    boxShadow:
      "0 7px 18px rgba(124,58,237,.12)",
  },

  optionLetter: {
    width: "32px",
    height: "32px",

    display: "grid",
    placeItems: "center",

    borderRadius: "50%",

    background: "#eee8ff",

    color: "#633bb4",

    fontWeight: "900",

    flexShrink: 0,
  },

  optionLetterSelected: {
    background:
      "linear-gradient(135deg,#7c3aed,#6366f1)",

    color: "white",
  },

  optionText: {
    flex: 1,
    fontSize: "15px",
    lineHeight: "1.45",
  },

  selectedCheck: {
    color: "#6d28d9",
    fontWeight: "900",
    fontSize: "18px",
  },

  // ===================================================
  // SCORE
  // ===================================================

  scoreBox: {
    position: "relative",
    overflow: "hidden",

    maxWidth: "650px",

    margin:
      "20px auto 35px",

    padding: "42px 25px",

    textAlign: "center",

    borderRadius: "28px",

    background:
      "linear-gradient(145deg,#ffffff,#eee8ff)",

    border:
      "1px solid rgba(139,92,246,.20)",

    boxShadow:
      "0 20px 50px rgba(65,45,130,.14)",
  },

  resultGlow: {
    position: "absolute",

    width: "300px",
    height: "300px",

    borderRadius: "50%",

    top: "-150px",
    left: "50%",

    transform: "translateX(-50%)",

    background:
      "radial-gradient(circle,rgba(124,58,237,.18),transparent 70%)",
  },

  resultEmoji: {
    position: "relative",

    fontSize: "58px",
    marginBottom: "10px",
  },

  completedBadge: {
    display: "inline-block",

    padding: "7px 12px",

    borderRadius: "20px",

    background: "#eee8ff",

    color: "#633bb4",

    fontSize: "11px",

    letterSpacing: "1.5px",

    fontWeight: "900",
  },

  scoreNumber: {
    fontSize: "56px",

    fontWeight: "900",

    color: "#5b3cc4",

    marginTop: "15px",
  },

  percentage: {
    display: "inline-block",

    marginTop: "5px",

    padding: "8px 20px",

    borderRadius: "30px",

    background:
      "linear-gradient(135deg,#7c3aed,#6366f1)",

    color: "white",

    fontSize: "23px",

    fontWeight: "900",

    boxShadow:
      "0 8px 20px rgba(91,60,196,.20)",
  },

  scoreMessage: {
    color: "#716a83",

    fontSize: "16px",

    margin:
      "17px 0 22px",

    lineHeight: "1.6",
  },

  newQuizButton: {
    padding: "12px 23px",

    border: "none",

    borderRadius: "12px",

    color: "white",

    background:
      "linear-gradient(135deg,#7c3aed,#5b3cc4)",

    cursor: "pointer",

    fontSize: "15px",

    fontWeight: "800",

    boxShadow:
      "0 9px 20px rgba(91,60,196,.20)",
  },

  // ===================================================
  // REVIEW
  // ===================================================

  reviewContainer: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  reviewHeading: {
    textAlign: "center",
    marginBottom: "25px",
  },

  reviewTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "10px",

    marginBottom: "14px",
  },

  reviewQuestionNumber: {
    color: "#716a83",

    fontSize: "14px",

    fontWeight: "800",
  },

  reviewQuestion: {
    color: "#35206e",

    lineHeight: "1.5",

    marginBottom: "15px",
  },

  reviewCard: {
    padding: "22px",

    marginBottom: "18px",

    borderRadius: "17px",

    background: "white",

    boxShadow:
      "0 8px 27px rgba(65,45,130,.08)",
  },

  correctBadge: {
    padding:
      "7px 12px",

    borderRadius: "20px",

    background: "#dcfce7",

    color: "#15803d",

    fontWeight: "900",

    fontSize: "13px",
  },

  wrongBadge: {
    padding:
      "7px 12px",

    borderRadius: "20px",

    background: "#fee2e2",

    color: "#b91c1c",

    fontWeight: "900",

    fontSize: "13px",
  },

  answerBox: {
    display: "flex",

    flexWrap: "wrap",

    gap: "8px",

    padding:
      "12px 15px",

    borderRadius: "10px",

    color: "#40356a",
  },

  correctAnswerBox: {
    display: "flex",

    flexWrap: "wrap",

    gap: "8px",

    padding:
      "12px 15px",

    marginTop: "10px",

    borderRadius: "10px",

    background: "#f0fdf4",

    border:
      "1px solid #bbf7d0",

    color: "#15803d",
  },

  resultMessage: {
    marginTop: "12px",

    padding: "11px 14px",

    borderRadius: "10px",

    fontSize: "14px",

    fontWeight: "700",
  },

  // ===================================================
  // STUDY PLAN
  // ===================================================

  planCard: {
    maxWidth: "750px",

    margin: "0 auto",

    padding: "30px",

    borderRadius: "25px",

    background:
      "linear-gradient(145deg,#ffffff,#f3edff)",

    border:
      "1px solid rgba(139,92,246,.17)",

    boxShadow:
      "0 18px 45px rgba(65,45,130,.10)",
  },

  planText: {
    marginTop: "15px",

    padding: "21px",

    background: "white",

    borderRadius: "13px",

    whiteSpace: "pre-wrap",

    lineHeight: "1.8",

    textAlign: "left",

    border:
      "1px solid #e8e1fb",
  },
};

export default App;