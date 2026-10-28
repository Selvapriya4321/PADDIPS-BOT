
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
require("dotenv").config();

const app = express();

// 1. CONFIGURATION
const PORT = process.env.PORT || 5000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const ALLOWED_ORIGINS = [
  "https://selvapriya4321.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
];

const MAX_MESSAGE_LENGTH = 10000;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

// 2. CORS AND JSON
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));

// 3. OPENAI API HELPER
async function generateAI(prompt, systemInstruction = "") {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it in Render Environment Variables."
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions:
        systemInstruction ||
        "You are PADDIPS BOT, a helpful AI learning assistant. Explain clearly with examples.",
      input: prompt,
      max_output_tokens: 5000,
    }),
    signal: AbortSignal.timeout(90000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI API request failed with HTTP ${response.status}`;

    // Never log or return the API key.
    console.error("OpenAI API error:", {
      status: response.status,
      message,
    });

    throw new Error(message);
  }

  const answer = (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error(
      `OpenAI returned no text. Response status: ${data.status || "unknown"}`
    );
  }

  return answer;
}

// 4. HEALTH CHECK
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PADDIPS BOT OpenAI Backend is Running",
    provider: "OpenAI",
    model: OPENAI_MODEL,
    endpoints: [
      "POST /api/chat",
      "POST /api/quiz",
      "POST /api/study-plan",
      "POST /api/upload-material",
    ],
  });
});

// 5. AI CHAT
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        reply: "Please enter a question.",
      });
    }

    const userMessage = message.trim();

    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        reply: "Please keep your question under 10,000 characters.",
      });
    }

    const reply = await generateAI(
      userMessage,
      [
        "You are PADDIPS BOT, an AI Learning and Study Assistant.",
        "Help students learn programming, computer science, databases,",
        "mathematics, and academic subjects.",
        "Explain in simple English with clear step-by-step instructions.",
        "Use practical examples when helpful.",
        "For beginners, avoid unnecessary jargon.",
      ].join(" ")
    );

    return res.json({ success: true, reply });
  } catch (error) {
    console.error("AI Chat Error:", error.message);

    return res.status(500).json({
      success: false,
      reply: "Sorry, I could not generate an AI response.",
      error: error.message,
    });
  }
});

// 6. AI QUIZ
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, count } = req.body || {};

    const selectedTopic =
      typeof topic === "string" && topic.trim()
        ? topic.trim().slice(0, 200)
        : "Computer Science";

    const requestedCount = Number(count);
    const allowedCounts = [5, 10, 15, 20];

    const quizCount = allowedCounts.includes(requestedCount)
      ? requestedCount
      : 5;

    const prompt = `
Create exactly ${quizCount} multiple-choice questions about:
${selectedTopic}

Rules:
- Suitable for college students.
- Exactly four options per question.
- Exactly one correct answer.
- The answer must exactly match one option.
- Return valid JSON only. Do not use Markdown fences.

Required JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    }
  ]
}
`;

    const quizText = await generateAI(
      prompt,
      "You are an educational quiz generator. Return one valid JSON object only, with no extra text."
    );

    const cleanedText = quizText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let quiz;

    try {
      quiz = JSON.parse(cleanedText);
    } catch {
      return res.status(502).json({
        success: false,
        error: "AI returned invalid quiz data. Please try again.",
      });
    }

    if (
      !quiz ||
      !Array.isArray(quiz.questions) ||
      quiz.questions.length !== quizCount
    ) {
      return res.status(502).json({
        success: false,
        error: "AI returned an incomplete quiz. Please try again.",
      });
    }

    for (const [index, question] of quiz.questions.entries()) {
      if (
        !question ||
        typeof question.question !== "string" ||
        !question.question.trim() ||
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        question.options.some(
          (option) => typeof option !== "string" || !option.trim()
        ) ||
        typeof question.answer !== "string" ||
        !question.options.includes(question.answer)
      ) {
        return res.status(502).json({
          success: false,
          error: `Invalid data in quiz question ${index + 1}.`,
        });
      }
    }

    return res.json({
      success: true,
      topic: selectedTopic,
      count: quizCount,
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

// 7. AI STUDY PLAN
app.post("/api/study-plan", async (req, res) => {
  try {
    const { subject, days } = req.body || {};

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 200
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a subject of up to 200 characters.",
      });
    }

    const selectedDays = Number(days);

    if (
      !Number.isInteger(selectedDays) ||
      selectedDays < 1 ||
      selectedDays > 60
    ) {
      return res.status(400).json({
        success: false,
        error: "Choose a study plan between 1 and 60 days.",
      });
    }

    const selectedSubject = subject.trim();

    const prompt = `
Create a practical study plan for a college student.

Subject: ${selectedSubject}
Duration: ${selectedDays} days

For every day include:
1. Day number
2. Topic to study
3. Learning objectives
4. Practice activity
5. Revision activity

Use simple English and a progressive learning order.
Include all days from Day 1 to Day ${selectedDays}.
Return plain text, not JSON.
`;

    const plan = await generateAI(
      prompt,
      "You are a helpful study planner for college students."
    );

    return res.json({
      success: true,
      subject: selectedSubject,
      days: selectedDays,
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

// 8. PDF UPLOAD CONFIGURATION
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(new Error("Only PDF files are supported."));
    }

    callback(null, true);
  },
});

// 9. PDF TEXT EXTRACTION
app.post(
  "/api/upload-material",
  upload.single("material"),
  async (req, res) => {
    let parser;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please select a PDF file.",
        });
      }

      console.log(
        "PDF upload received:",
        req.file.originalname,
        req.file.size,
        "bytes"
      );

      parser = new PDFParse({ data: req.file.buffer });

      const result = await parser.getText();
      const extractedText = result.text || "";

      if (!extractedText.trim()) {
        return res.status(400).json({
          success: false,
          error: "No readable text was found in this PDF.",
        });
      }

      return res.json({
        success: true,
        filename: req.file.originalname,
        pages: result.total || 1,
        text: extractedText,
        message: "PDF uploaded and read successfully.",
      });
    } catch (error) {
      console.error("PDF Processing Error:", error.message);

      return res.status(500).json({
        success: false,
        error: "PDF processing failed.",
        message: error.message,
      });
    } finally {
      if (parser && typeof parser.destroy === "function") {
        try {
          await parser.destroy();
        } catch (error) {
          console.error("PDF cleanup error:", error.message);
        }
      }
    }
  }
);

// 10. ERROR HANDLER
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "PDF size must be 10 MB or less."
        : error.message;

    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  if (error.message === "Only PDF files are supported.") {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (error.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "This website is not allowed to access the API.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Request body is too large.",
    });
  }

  console.error("Unhandled Server Error:", error.message);

  return res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

// 11. START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log("==================================");
  console.log("PADDIPS BOT BACKEND STARTED");
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI model: ${OPENAI_MODEL}`);
  console.log("==================================");
});
        
