
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
require("dotenv").config();

const app = express();

// =====================================================
// GEMINI AI CONFIGURATION
// =====================================================

async function generateAI(prompt, systemInstruction = "") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it in Render Environment."
    );
  }

  // Use a model supported by your Gemini API account.
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API error:", data.error || data);

    throw new Error(
      data.error?.message || `Gemini API failed with status ${response.status}`
    );
  }

  const answer = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error(
      "Gemini returned no text. Try the request again."
    );
  }

  return answer;
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "2mb" }));

// =====================================================
// PDF UPLOAD CONFIGURATION
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported."));
    }
  },
});

// =====================================================
// TEST BACKEND
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Learning Assistant Backend is Running 🚀",
  });
});

// =====================================================
// AI CHAT
// POST /api/chat
// =====================================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        reply: "Please enter a question.",
      });
    }

    console.log("CHAT REQUEST:", message.trim());

    const reply = await generateAI(
      message.trim(),
      "You are PADDIPS BOT, an AI Learning and Study Assistant. Explain answers clearly and simply for college students. Use step-by-step explanations and examples when helpful."
    );

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("AI Chat Error:", error.message);

    return res.status(500).json({
      success: false,
      reply: "Sorry, I could not connect to the AI right now.",
      error: error.message,
    });
  }
});

// =====================================================
// AI QUIZ
// POST /api/quiz
// =====================================================

app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, count } = req.body || {};

    const selectedTopic =
      typeof topic === "string" && topic.trim()
        ? topic.trim()
        : "Computer Science";

    const requestedCount = Number(count);
    const allowedCounts = [5, 10, 15, 20];

    const quizCount = allowedCounts.includes(requestedCount)
      ? requestedCount
      : 5;

    console.log("QUIZ REQUEST:", selectedTopic, quizCount);

    const quizPrompt = `
Create exactly ${quizCount} multiple-choice questions about:
${selectedTopic}

Requirements:
1. Generate exactly ${quizCount} questions.
2. Each question must have exactly four options.
3. There must be exactly one correct answer.
4. The answer must exactly match one of the options.
5. Questions should suit college students.
6. Avoid duplicate questions.
7. Cover different concepts.
8. Do not include explanations.
9. Return only valid JSON. Do not use Markdown code fences.

Return this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Option A"
    }
  ]
}
`;

    const quizText = await generateAI(
      quizPrompt,
      "You are a careful educational quiz generator. Follow the requested JSON format exactly."
    );

    // Remove Markdown fences if the model includes them.
    const cleanedText = quizText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let quiz;

    try {
      quiz = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Quiz JSON Parse Error:", parseError.message);

      return res.status(500).json({
        success: false,
        error: "AI returned invalid quiz JSON. Please try again.",
      });
    }

    if (!quiz || !Array.isArray(quiz.questions)) {
      return res.status(500).json({
        success: false,
        error: "Invalid quiz response from AI.",
      });
    }

    if (quiz.questions.length !== quizCount) {
      return res.status(500).json({
        success: false,
        error: `AI generated ${quiz.questions.length} questions instead of ${quizCount}. Please try again.`,
        generated: quiz.questions.length,
        requested: quizCount,
      });
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];

      if (
        !question ||
        typeof question.question !== "string" ||
        !question.question.trim()
      ) {
        return res.status(500).json({
          success: false,
          error: `Invalid question text at question ${i + 1}.`,
        });
      }

      if (
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        question.options.some(
          (option) =>
            typeof option !== "string" || !option.trim()
        )
      ) {
        return res.status(500).json({
          success: false,
          error: `Question ${i + 1} must contain exactly four valid options.`,
        });
      }

      if (
        typeof question.answer !== "string" ||
        !question.options.includes(question.answer)
      ) {
        return res.status(500).json({
          success: false,
          error: `The correct answer for question ${i + 1} must match one of its options.`,
        });
      }
    }

    console.log(`Quiz generated successfully: ${quizCount} questions`);

    return res.json({
      success: true,
      count: quizCount,
      topic: selectedTopic,
      questions: quiz.questions,
    });
  } catch (error) {
    console.error("AI Quiz Error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Quiz generation failed.",
      message: error.message,
    });
  }
});

// =====================================================
// AI STUDY PLAN
// POST /api/study-plan
// =====================================================

app.post("/api/study-plan", async (req, res) => {
  try {
    const { subject, days } = req.body || {};

    if (
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a subject.",
      });
    }

    const selectedDays = Number(days);

    if (
      !Number.isInteger(selectedDays) ||
      selectedDays < 1 ||
      selectedDays > 365
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a number of days from 1 to 365.",
      });
    }

    const selectedSubject = subject.trim();

    console.log(
      "STUDY PLAN REQUEST:",
      selectedSubject,
      selectedDays
    );

    const studyPrompt = `
Create a simple, practical study plan for a college student.

Subject: ${selectedSubject}
Number of days: ${selectedDays}

For every day include:
- Day number
- Topic to study
- What to learn
- Practice activity
- Revision activity

Make the plan easy to understand.
Cover the subject progressively.
Continue until Day ${selectedDays}.
Return plain text only.
`;

    const plan = await generateAI(
      studyPrompt,
      "You are a helpful study planner for college students. Create realistic, organized daily plans."
    );

    console.log("Study plan generated successfully.");

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Study Plan Error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Study plan generation failed.",
      message: error.message,
    });
  }
});

// =====================================================
// PDF UPLOAD AND TEXT EXTRACTION
// POST /api/upload-material
// Form field: material
// =====================================================

app.post(
  "/api/upload-material",
  upload.single("material"),
  async (req, res) => {
    let parser = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please select a PDF file.",
        });
      }

      console.log("PDF upload:", req.file.originalname);
      console.log("PDF size:", req.file.size, "bytes");

      parser = new PDFParse({
        data: req.file.buffer,
      });

      const pdfData = await parser.getText();
      const extractedText = pdfData.text || "";

      if (!extractedText.trim()) {
        return res.status(400).json({
          success: false,
          error: "The PDF does not contain readable text.",
        });
      }

      return res.json({
        success: true,
        filename: req.file.originalname,
        pages: pdfData.total || 1,
        text: extractedText,
        message: "PDF uploaded and read successfully! ✅",
      });
    } catch (error) {
      console.error("PDF Upload Error:", error.message);

      return res.status(500).json({
        success: false,
        error: "PDF processing failed.",
        message: error.message,
      });
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (destroyError) {
          console.error(
            "PDF parser cleanup error:",
            destroyError.message
          );
        }
      }
    }
  }
);

// =====================================================
// MULTER AND UPLOAD ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "PDF size must be less than 10 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (error && error.message === "Only PDF files are supported.") {
    return res.status(400).json({
      success: false,
      error: "Only PDF files are supported.",
    });
  }

  return next(error);
});

// =====================================================
// GENERAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("Unhandled Server Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

// =====================================================
// START SERVER — RENDER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("🤖 PADDIPS BOT BACKEND");
  console.log("=================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("GET  /");
  console.log("POST /api/chat");
  console.log("POST /api/quiz");
  console.log("POST /api/study-plan");
  console.log("POST /api/upload-material");
  console.log("=================================");
});
