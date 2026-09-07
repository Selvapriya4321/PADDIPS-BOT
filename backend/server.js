const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
require("dotenv").config();

const app = express();

// =====================================================
// OPENAI
// =====================================================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

// =====================================================
// PDF UPLOAD CONFIGURATION
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
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
// =====================================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("=================================");
    console.log("CHAT REQUEST");
    console.log("Student asked:", message);
    console.log("=================================");

    if (!message || !message.trim()) {
      return res.status(400).json({
        reply: "Please enter a question.",
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "system",
          content:
            "You are an AI Learning and Study Assistant. Explain answers clearly and simply for college students. Use examples when helpful.",
        },

        {
          role: "user",
          content: message.trim(),
        },
      ],
    });

    res.json({
      success: true,
      reply: response.output_text,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);

    res.status(500).json({
      success: false,
      reply: "Sorry, I could not connect to the AI right now.",
      error: error.message,
    });
  }
});

// =====================================================
// AI QUIZ
// =====================================================

app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, count } = req.body;

    console.log("=================================");
    console.log("QUIZ REQUEST");
    console.log("Quiz topic:", topic);
    console.log("Quiz count received:", count);
    console.log("=================================");

    // ---------------------------------------------------
    // TOPIC
    // ---------------------------------------------------

    const selectedTopic =
      topic &&
      typeof topic === "string" &&
      topic.trim()
        ? topic.trim()
        : "Computer Science";

    // ---------------------------------------------------
    // QUESTION COUNT
    // ---------------------------------------------------

    const requestedCount = Number(count);

    const allowedCounts = [5, 10, 15, 20];

    const quizCount = allowedCounts.includes(requestedCount)
      ? requestedCount
      : 5;

    console.log("Final quiz count:", quizCount);

    // ---------------------------------------------------
    // AI QUIZ GENERATION
    // ---------------------------------------------------

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      input: `
You are an AI Learning and Study Assistant.

Create exactly ${quizCount} multiple-choice questions.

Topic:
${selectedTopic}

Rules:

1. Create exactly ${quizCount} questions.
2. Every question must have exactly 4 options.
3. Only one option must be correct.
4. The answer must exactly match one of the options.
5. Questions should be suitable for a college student.
6. Questions must be different from each other.
7. Questions should cover different concepts from the selected topic.
8. Do not add explanations.
9. Do not add any text outside the JSON.
10. Do not use Markdown.
11. Return ONLY valid JSON.

Return exactly this structure:

{
  "questions": [
    {
      "question": "Question here",
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
      `,
    });

    console.log("=================================");
    console.log("AI QUIZ RESPONSE");
    console.log(response.output_text);
    console.log("=================================");

    // ---------------------------------------------------
    // PARSE JSON
    // ---------------------------------------------------

    let quiz;

    try {
      quiz = JSON.parse(response.output_text);
    } catch (parseError) {
      console.error("Quiz JSON Parse Error:", parseError);

      return res.status(500).json({
        success: false,
        error: "AI returned invalid quiz JSON.",
        raw: response.output_text,
      });
    }

    // ---------------------------------------------------
    // VALIDATE QUESTIONS ARRAY
    // ---------------------------------------------------

    if (
      !quiz ||
      !quiz.questions ||
      !Array.isArray(quiz.questions)
    ) {
      return res.status(500).json({
        success: false,
        error: "Invalid quiz response from AI.",
      });
    }

    // ---------------------------------------------------
    // VALIDATE QUESTION COUNT
    // ---------------------------------------------------

    if (quiz.questions.length !== quizCount) {
      console.error(
        `AI generated ${quiz.questions.length} questions instead of ${quizCount}`
      );

      return res.status(500).json({
        success: false,
        error: `AI generated ${quiz.questions.length} questions instead of ${quizCount}. Please generate again.`,
        generated: quiz.questions.length,
        requested: quizCount,
      });
    }

    // ---------------------------------------------------
    // VALIDATE EVERY QUESTION
    // ---------------------------------------------------

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];

      // Question text
      if (
        !q.question ||
        typeof q.question !== "string"
      ) {
        return res.status(500).json({
          success: false,
          error: `Invalid question text at question ${
            i + 1
          }.`,
        });
      }

      // Options
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4
      ) {
        return res.status(500).json({
          success: false,
          error: `Question ${
            i + 1
          } must contain exactly 4 options.`,
        });
      }

      // Check every option
      for (let j = 0; j < q.options.length; j++) {
        if (
          typeof q.options[j] !== "string" ||
          !q.options[j].trim()
        ) {
          return res.status(500).json({
            success: false,
            error:
              `Invalid option at question ${
                i + 1
              }, option ${j + 1}.`,
          });
        }
      }

      // Answer
      if (
        !q.answer ||
        typeof q.answer !== "string"
      ) {
        return res.status(500).json({
          success: false,
          error:
            `Question ${
              i + 1
            } does not contain a valid answer.`,
        });
      }

      // Answer must match an option
      if (!q.options.includes(q.answer)) {
        return res.status(500).json({
          success: false,
          error:
            `Correct answer for question ${
              i + 1
            } does not match any option.`,
        });
      }
    }

    // ---------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------

    console.log(
      `✅ Successfully generated ${quizCount} questions`
    );

    res.json({
      success: true,
      count: quizCount,
      topic: selectedTopic,
      questions: quiz.questions,
    });
  } catch (error) {
    console.error("AI Quiz Error:", error);

    res.status(500).json({
      success: false,
      error: "Quiz generation failed.",
      message: error.message,
    });
  }
});

// =====================================================
// AI STUDY PLAN
// =====================================================

app.post("/api/study-plan", async (req, res) => {
  try {
    const { subject, days } = req.body;

    console.log("=================================");
    console.log("STUDY PLAN REQUEST");
    console.log("Subject:", subject);
    console.log("Days:", days);
    console.log("=================================");

    // ---------------------------------------------------
    // VALIDATE SUBJECT
    // ---------------------------------------------------

    if (
      !subject ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a subject.",
      });
    }

    // ---------------------------------------------------
    // VALIDATE DAYS
    // ---------------------------------------------------

    if (!days || Number(days) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid number of days.",
      });
    }

    const selectedSubject = subject.trim();
    const selectedDays = Number(days);

    // ---------------------------------------------------
    // AI STUDY PLAN
    // ---------------------------------------------------

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      input: `
You are an AI Learning and Study Assistant.

Create a simple and practical study plan for a college student.

Subject:
${selectedSubject}

Number of days:
${selectedDays}

For every day include:

Day number
Topic to study
What to learn
Practice activity
Revision activity

Make the plan easy to understand.

Example:

Day 1
Topic: Introduction
Study: Learn the basic concepts
Practice: Solve 5 questions
Revision: Review today's topics

Day 2
Topic: Functions
Study: Learn functions
Practice: Write 5 programs
Revision: Review Day 1 and Day 2

Continue until Day ${selectedDays}.

Return plain text only.
      `,
    });

    console.log("✅ Study Plan Generated");

    res.json({
      success: true,
      plan: response.output_text,
    });
  } catch (error) {
    console.error("Study Plan Error:", error);

    res.status(500).json({
      success: false,
      error: "Study plan generation failed.",
      message: error.message,
    });
  }
});

// =====================================================
// PDF UPLOAD AND TEXT EXTRACTION
// =====================================================

app.post(
  "/api/upload-material",
  upload.single("material"),
  async (req, res) => {
    let parser = null;

    try {
      console.log("=================================");
      console.log("PDF upload request received 📄");
      console.log("=================================");

      // -------------------------------------------------
      // CHECK FILE
      // -------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please select a PDF file.",
        });
      }

      console.log(
        "File name:",
        req.file.originalname
      );

      console.log(
        "File type:",
        req.file.mimetype
      );

      console.log(
        "File size:",
        req.file.size,
        "bytes"
      );

      // -------------------------------------------------
      // CHECK PDF
      // -------------------------------------------------

      if (
        req.file.mimetype !==
        "application/pdf"
      ) {
        return res.status(400).json({
          success: false,
          error: "Only PDF files are supported.",
        });
      }

      // -------------------------------------------------
      // CREATE PDF PARSER
      // -------------------------------------------------

      console.log("Reading PDF...");

      parser = new PDFParse({
        data: req.file.buffer,
      });

      // -------------------------------------------------
      // EXTRACT TEXT
      // -------------------------------------------------

      const pdfData = await parser.getText();

      const extractedText =
        pdfData.text || "";

      console.log(
        "PDF text extracted successfully ✅"
      );

      console.log(
        "PDF pages:",
        pdfData.total
      );

      console.log(
        "Extracted characters:",
        extractedText.length
      );

      // -------------------------------------------------
      // EMPTY PDF
      // -------------------------------------------------

      if (!extractedText.trim()) {
        return res.status(400).json({
          success: false,
          error:
            "The PDF does not contain readable text.",
        });
      }

      // -------------------------------------------------
      // SEND RESULT
      // -------------------------------------------------

      res.json({
        success: true,

        filename:
          req.file.originalname,

        pages:
          pdfData.total || 1,

        text:
          extractedText,

        message:
          "PDF uploaded and read successfully! ✅",
      });
    } catch (error) {
      console.error(
        "PDF Upload Error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "PDF processing failed.",
        message:
          error.message,
      });
    } finally {
      // -------------------------------------------------
      // CLEANUP PDF PARSER
      // -------------------------------------------------

      if (parser) {
        try {
          await parser.destroy();

          console.log(
            "PDF parser cleaned up ✅"
          );
        } catch (destroyError) {
          console.error(
            "Parser cleanup error:",
            destroyError.message
          );
        }
      }
    }
  }
);

// =====================================================
// MULTER ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error:
            "PDF size must be less than 10 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error &&
      error.message ===
        "Only PDF files are supported."
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Only PDF files are supported.",
      });
    }

    next(error);
  }
);

// =====================================================
// GENERAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled Server Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Internal server error.",
      message: error.message,
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("=================================");
  console.log("🤖 PADDIPS BOT BACKEND");
  console.log("=================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("");
  console.log("Available APIs:");
  console.log("POST /api/chat");
  console.log("POST /api/quiz");
  console.log("POST /api/study-plan");
  console.log("POST /api/upload-material");
  console.log("GET  /");
  console.log("=================================");
});