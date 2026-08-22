import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));

// Initialize Google GenAI client lazily or safely
let genAIClient: GoogleGenAI | null = null;

function getGenAIClient() {
  if (genAIClient) return genAIClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing from environment variables.");
  }

  genAIClient = new GoogleGenAI({
    apiKey: apiKey || "dummy-key-for-dev",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  return genAIClient;
}

// Persistent local user database
interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

function loadUsers(): Map<string, DBUser> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, "[]", "utf8");
      return new Map();
    }

    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const users: DBUser[] = JSON.parse(raw);

    return new Map(users.map((user) => [user.id, user]));
  } catch (error) {
    console.error("Failed to load users:", error);
    return new Map();
  }
}

function saveUsers(users: Map<string, DBUser>) {
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify(Array.from(users.values()), null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Failed to save users:", error);
  }
}

const usersDb: Map<string, DBUser> = loadUsers();

// Ensure the built-in demo account exists.
if (!Array.from(usersDb.values()).some(
  (user) => user.email.toLowerCase() === "alex.rivera@nexus.ai"
)) {
  const demoPasswordHash = crypto
    .createHash("sha256")
    .update("demo123")
    .digest("hex");

  usersDb.set("demo-user-1", {
    id: "demo-user-1",
    name: "Alex Rivera",
    email: "alex.rivera@nexus.ai",
    passwordHash: demoPasswordHash,
    createdAt: new Date().toISOString(),
  });

  saveUsers(usersDb);
}

// Seed sample documents
const documentsDb: Map<string, any> = new Map();
documentsDb.set("doc-1", {
  id: "doc-1",
  userId: "demo-user-1",
  title: "Q3 AI Product Roadmap & Strategy",
  fileName: "Q3_Product_Roadmap.md",
  fileType: "markdown",
  fileSize: 4200,
  uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  summary: "Comprehensive strategy outlining AI agent features, voice synthesis, smart reminders, and document semantic retrieval.",
  tags: ["Strategy", "Roadmap", "Product"],
  content: `# Q3 AI Product Roadmap & Strategy

## Executive Summary
Nexus AI is advancing into a unified intelligent workspace. The goal is to combine chat assistant, smart reminders with automated task breakdown, semantic document search (RAG), and voice dictation.

## Core Pillars
1. **AI Chat Assistant**: Multi-modal chat powered by Gemini 3.6 Flash. Supports custom system instructions, markdown formatting, and contextual memory.
2. **Smart Reminders**: Natural language parsing to schedule reminders, auto-generate step-by-step subtasks, and prioritize urgent deliverables.
3. **Semantic Document Search**: High-accuracy context retrieval across uploaded Markdown, PDF, CSV, and text notes.
4. **Voice Interaction**: Native speech-to-text dictation and speech synthesis for hands-free productivity.

## Target Metrics
- Reduce document search time by 75%
- Achieve 98% accuracy in natural language reminder scheduling
- Maintain sub-second latency for AI responses`,
  chunks: [
    { id: "c1", content: "Executive Summary: Nexus AI is advancing into a unified intelligent workspace combining chat, smart reminders, document search, and voice." },
    { id: "c2", content: "Core Pillars: AI Chat Assistant (Gemini 3.6 Flash), Smart Reminders (natural language date/task breakdown), Semantic Document Search, Voice Interaction." },
    { id: "c3", content: "Target Metrics: Reduce document search time by 75%, achieve 98% accuracy in reminder scheduling, maintain sub-second latency." },
  ]
});

documentsDb.set("doc-2", {
  id: "doc-2",
  userId: "demo-user-1",
  title: "Remote Work & Security Guidelines",
  fileName: "Security_Policy_2026.txt",
  fileType: "text",
  fileSize: 2800,
  uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  summary: "Internal guidelines for secure authentication, token storage, encryption standards, and remote access protocols.",
  tags: ["Security", "Compliance", "Policy"],
  content: `Nexus Security & Remote Work Policy (Updated 2026)

1. Account Protection: All user accounts must utilize strong SHA-256 encrypted passwords or OAuth single-sign-on protocols. Session tokens expire after 24 hours of inactivity.
2. Data Privacy: All document search queries and prompt inputs are processed through secure server-side proxy routes. API keys must never be exposed to browser runtimes.
3. Incident Response: If suspicious login activity is detected, accounts undergo automated session invalidation and mandatory 2FA re-verification.
4. Voice & Audio Data: Voice recordings captured during dictation are processed ephemerally and never retained without explicit user consent.`,
  chunks: [
    { id: "c1", content: "Account Protection: All user accounts must utilize strong SHA-256 encrypted passwords or OAuth SSO. Tokens expire after 24h." },
    { id: "c2", content: "Data Privacy: Queries and inputs process through secure server-side proxy routes. API keys are never exposed on client." },
    { id: "c3", content: "Voice Privacy: Voice recordings captured during dictation are processed ephemerally and never retained without explicit user consent." }
  ]
});

// Seed sample reminders
const remindersDb: Map<string, any> = new Map();
remindersDb.set("rem-1", {
  id: "rem-1",
  userId: "demo-user-1",
  title: "Review Q3 AI Roadmap with Engineering Team",
  description: "Walk through key milestones, AI document search accuracy, and voice dictation support.",
  dueDate: new Date(Date.now() + 86400000).toISOString(),
  priority: "high",
  category: "work",
  isCompleted: false,
  createdAt: new Date().toISOString(),
  subtasks: [
    { id: "s1", text: "Prepare slide deck highlighting Gemini 3.6 Flash capabilities", completed: true },
    { id: "s2", text: "Test voice input latency benchmarks", completed: false },
    { id: "s3", text: "Send meeting invite to lead developers", completed: false }
  ],
  aiSuggestedSteps: [
    "Draft agenda emphasizing latency benchmarks",
    "Prepare live demo of document search semantic retrieval"
  ]
});

remindersDb.set("rem-2", {
  id: "rem-2",
  userId: "demo-user-1",
  title: "Quarterly Security Compliance Audit",
  description: "Verify server-side API proxy protection and credential secret rotation.",
  dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
  priority: "urgent",
  category: "work",
  isCompleted: false,
  createdAt: new Date().toISOString(),
  subtasks: [
    { id: "s1", text: "Verify API key is isolated on server side", completed: true },
    { id: "s2", text: "Check session token expiration rules", completed: false }
  ],
  aiSuggestedSteps: [
    "Run security scan on environment secrets",
    "Audit document access logs"
  ]
});

// ==================== AUTHENTICATION ====================

function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(String(password), "utf8")
    .digest("hex");
}

function getUserIdFromReq(req: express.Request): string {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (token.startsWith("user_")) {
      return token.slice(5);
    }
  }

  return "";
}

// API ROUTE: Login
app.post("/api/auth/login", (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = Array.from(usersDb.values()).find(
      (u) => u.email.trim().toLowerCase() === email
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const passwordHash = hashPassword(password);

    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = `user_${user.id}`;

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        preferences: {
          theme: "light",
          autoTextToSpeech: false,
          voiceGender: "female",
          reminderNotifications: true,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Unable to complete sign in",
    });
  }
});

// API ROUTE: Register
app.post("/api/auth/register", (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const existing = Array.from(usersDb.values()).find(
      (u) => u.email.trim().toLowerCase() === email
    );

    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    const id = `user-${Date.now()}`;

    const newUser: DBUser = {
      id,
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    usersDb.set(id, newUser);
    saveUsers(usersDb);

    const token = `user_${id}`;

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        preferences: {
          theme: "light",
          autoTextToSpeech: false,
          voiceGender: "female",
          reminderNotifications: true,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Unable to create account",
    });
  }
});

// API ROUTE: Current user
app.get("/api/auth/me", (req, res) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);

  if (!user) {
    return res.status(401).json({
      error: "Invalid or expired session",
    });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      preferences: {
        theme: "light",
        autoTextToSpeech: false,
        voiceGender: "female",
        reminderNotifications: true,
      },
    },
  });
});

// API ROUTE: AI Chat with Gemini 3.6 Flash
app.post("/api/chat/generate", async (req, res) => {
  try {
    const { message, history = [], systemInstruction, attachedDocIds = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const userId = getUserIdFromReq(req);
    const ai = getGenAIClient();

    // Gather attached document context if selected
    let contextDocs = "";
    if (attachedDocIds.length > 0) {
      const userDocs = Array.from(documentsDb.values()).filter(
        (d) => d.userId === userId && attachedDocIds.includes(d.id)
      );

      if (userDocs.length > 0) {
        contextDocs =
          "\n\nATTACHED DOCUMENTS CONTEXT:\n" +
          userDocs
            .map(
              (d) =>
                `--- Document: ${d.title} (${d.fileName}) ---\n${d.content}`
            )
            .join("\n\n");
      }
    }

    const sysPrompt =
      (systemInstruction ||
        "You are Nexus AI, a highly capable, articulate, and helpful workspace assistant.") +
      contextDocs;

    const contents: any[] = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const geminiStart = Date.now();
    console.log("Gemini streaming request started:", new Date().toISOString());

    const stream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction: sysPrompt,
      },
    });

    // Stream newline-delimited JSON to the browser.
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullText = "";

    for await (const chunk of stream) {
      const text = chunk.text || "";

      if (text) {
        fullText += text;

        res.write(
          JSON.stringify({
            type: "chunk",
            text,
          }) + "\n"
        );
      }
    }

    console.log(
      `Gemini streaming response completed in ${Date.now() - geminiStart}ms`
    );

    const sources =
      attachedDocIds.length > 0
        ? attachedDocIds
            .map((id) => {
              const doc = documentsDb.get(id);
              return doc
                ? {
                    documentId: doc.id,
                    documentTitle: doc.title,
                    snippet:
                      doc.summary || doc.content.slice(0, 150),
                  }
                : null;
            })
            .filter(Boolean)
        : [];

    res.write(
      JSON.stringify({
        type: "done",
        sources,
        reply:
          fullText ||
          "I processed your request, but received an empty response from Gemini.",
      }) + "\n"
    );

    res.end();
  } catch (error: any) {
    console.error("Chat generation error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Failed to process AI message with Gemini",
        details: error.message || String(error),
      });
    }

    res.write(
      JSON.stringify({
        type: "error",
        error: error.message || "Gemini generation failed",
      }) + "\n"
    );

    res.end();
  }
});

// API ROUTE: AI Smart Reminder Parse & Generate
app.post("/api/reminders/parse-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    const ai = getGenAIClient();

    // Capture the server clock ONCE.
    // Relative reminders are calculated locally from this exact timestamp.
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Current date and time is ${nowIso}.

Parse the following user request into a structured reminder task:

"${prompt}"

Extract:
1. Title (concise action title)
2. Description (detailed context)
3. Priority ("low", "medium", "high", or "urgent")
4. Category ("work", "personal", "health", "finance", "learning", "other")
5. Estimated Due Date (ISO string if the request specifies an absolute/calendar date)
6. Subtasks (array of 2 to 4 actionable steps to complete this task)
7. AiSuggestedSteps (array of 2 helpful execution tips)

IMPORTANT:
- If the user gives a relative duration such as "in 1 minute", "after 5 minutes", "in 2 hours", etc., do NOT calculate that relative time yourself.
- Return an empty string for dueDateIso for relative-duration requests.
- The application server will calculate relative durations exactly from the current server time.
- For calendar/absolute requests such as "tomorrow at 3 PM", "next Monday at 9 AM", or "August 25 at 10 AM", provide the appropriate ISO date/time.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
            },
            description: {
              type: Type.STRING,
            },
            priority: {
              type: Type.STRING,
            },
            category: {
              type: Type.STRING,
            },
            dueDateIso: {
              type: Type.STRING,
            },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
            aiSuggestedSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          required: [
            "title",
            "priority",
            "category",
            "subtasks",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const userId = getUserIdFromReq(req);

    /*
     * ============================================================
     * EXACT RELATIVE REMINDER TIME
     * ============================================================
     *
     * Examples:
     *   "in 30 seconds"
     *   "in 1 minute"
     *   "after 5 minutes"
     *   "in 2 hours"
     *   "in 1 day"
     *   "in 2 weeks"
     *
     * These are calculated directly from the server timestamp.
     * Gemini is NEVER trusted to calculate relative durations.
     */

    const normalizedPrompt = String(prompt)
      .trim()
      .toLowerCase();

    let dueDate: string | undefined;

    const relativeMatch = normalizedPrompt.match(
      /\b(?:in|after)\s+(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?)\b/i
    );

    if (relativeMatch) {
      const amount = Number(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();

      let milliseconds = 0;

      if (
        unit.startsWith("second") ||
        unit.startsWith("sec")
      ) {
        milliseconds = amount * 1000;
      } else if (
        unit.startsWith("minute") ||
        unit.startsWith("min")
      ) {
        milliseconds = amount * 60 * 1000;
      } else if (
        unit.startsWith("hour") ||
        unit.startsWith("hr")
      ) {
        milliseconds = amount * 60 * 60 * 1000;
      } else if (unit.startsWith("day")) {
        milliseconds = amount * 24 * 60 * 60 * 1000;
      } else if (unit.startsWith("week")) {
        milliseconds = amount * 7 * 24 * 60 * 60 * 1000;
      }

      if (milliseconds > 0) {
        dueDate = new Date(
          nowMs + milliseconds
        ).toISOString();

        console.log(
          `[REMINDER EXACT] "${prompt}" -> ${dueDate} (${milliseconds}ms from server now)`
        );
      }
    }

    /*
     * ============================================================
     * ABSOLUTE / CALENDAR REMINDERS
     * ============================================================
     *
     * Gemini's parsed ISO timestamp is used for requests such as:
     *   "tomorrow at 3 PM"
     *   "next Monday at 9 AM"
     *   "August 25 at 10 AM"
     */

    if (
      !dueDate &&
      parsed.dueDateIso &&
      !isNaN(Date.parse(parsed.dueDateIso))
    ) {
      dueDate = new Date(
        parsed.dueDateIso
      ).toISOString();

      console.log(
        `[REMINDER CALENDAR] "${prompt}" -> ${dueDate}`
      );
    }

    /*
     * ============================================================
     * SAFE FALLBACK
     * ============================================================
     */

    if (!dueDate) {
      dueDate = new Date(
        nowMs + 24 * 60 * 60 * 1000
      ).toISOString();

      console.warn(
        `[REMINDER FALLBACK] Could not determine due date for "${prompt}". Using ${dueDate}`
      );
    }

    const newReminder = {
      id: `rem-${Date.now()}`,
      userId,
      title: parsed.title || prompt,
      description:
        parsed.description ||
        "Created via AI Smart Voice/Text Input",
      dueDate,
      priority: [
        "low",
        "medium",
        "high",
        "urgent",
      ].includes(parsed.priority)
        ? parsed.priority
        : "medium",
      category: [
        "work",
        "personal",
        "health",
        "finance",
        "learning",
        "other",
      ].includes(parsed.category)
        ? parsed.category
        : "personal",
      isCompleted: false,
      createdAt: new Date().toISOString(),
      subtasks: (
        parsed.subtasks || [
          "Get started on this item",
        ]
      ).map((st: string, idx: number) => ({
        id: `s-${idx}-${Date.now()}`,
        text: st,
        completed: false,
      })),
      aiSuggestedSteps:
        parsed.aiSuggestedSteps || [
          "Break task into 15-minute focused blocks",
          "Review progress upon completion",
        ],
    };

    remindersDb.set(
      newReminder.id,
      newReminder
    );

    console.log(
      `[REMINDER CREATED] ${newReminder.id} | due=${newReminder.dueDate} | now=${new Date().toISOString()}`
    );

    return res.json({
      reminder: newReminder,
    });
  } catch (error: any) {
    console.error(
      "AI Reminder Parse Error:",
      error
    );

    const errorMessage =
      error?.message ||
      error?.error?.message ||
      String(error);

    return res.status(500).json({
      error: "Failed to parse reminder with AI",
      details: errorMessage,
    });
  }
});

// API ROUTE: Get Reminders
app.get("/api/reminders", (req, res) => {
  const userId = getUserIdFromReq(req);
  const userReminders = Array.from(remindersDb.values()).filter((r) => r.userId === userId);
  return res.json({ reminders: userReminders });
});

// API ROUTE: Create / Update / Delete Reminder
app.post("/api/reminders", (req, res) => {
  const userId = getUserIdFromReq(req);
  const reminderData = req.body;

  const newReminder = {
    ...reminderData,
    id: reminderData.id || `rem-${Date.now()}`,
    userId,
    createdAt: reminderData.createdAt || new Date().toISOString(),
    isCompleted: reminderData.isCompleted || false,
    subtasks: reminderData.subtasks || [],
  };

  remindersDb.set(newReminder.id, newReminder);
  return res.json({ reminder: newReminder });
});

app.put("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const existing = remindersDb.get(id);
  if (!existing) {
    return res.status(404).json({ error: "Reminder not found" });
  }
  const updated = { ...existing, ...req.body };
  remindersDb.set(id, updated);
  return res.json({ reminder: updated });
});

app.delete("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  remindersDb.delete(id);
  return res.json({ success: true, id });
});

// API ROUTE: Document Upload & Parsing
app.post("/api/documents/upload", async (req, res) => {
  try {
    const { title, fileName, fileType, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Document title and text content are required" });
    }

    const userId = getUserIdFromReq(req);
    const ai = getGenAIClient();

    // Summarize document with Gemini
    const summaryResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Provide a concise 2-sentence summary and 3 key tags for this document text:

"${content.slice(0, 3000)}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["summary", "tags"],
        },
      },
    });

    const parsedSummary = JSON.parse(summaryResponse.text || "{}");

    // Chunk document text for semantic search
    const paragraphs = content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 10);
    const chunks = paragraphs.map((p: string, idx: number) => ({
      id: `chunk-${idx + 1}`,
      content: p.trim(),
      pageNumber: Math.floor(idx / 3) + 1,
    }));

    const docId = `doc-${Date.now()}`;
    const newDoc = {
      id: docId,
      userId,
      title,
      fileName: fileName || `${title.replace(/\s+/g, "_")}.txt`,
      fileType: fileType || "text",
      fileSize: Buffer.byteLength(content, "utf8"),
      uploadedAt: new Date().toISOString(),
      summary: parsedSummary.summary || "Uploaded document.",
      tags: parsedSummary.tags || ["General"],
      content,
      chunks,
    };

    documentsDb.set(docId, newDoc);
    return res.json({ document: newDoc });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return res.status(500).json({ error: "Failed to parse document with AI", details: error.message });
  }
});

// API ROUTE: Get User Documents
app.get("/api/documents", (req, res) => {
  const userId = getUserIdFromReq(req);
  const userDocs = Array.from(documentsDb.values()).filter((d) => d.userId === userId);
  return res.json({ documents: userDocs });
});

// API ROUTE: Delete Document
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  documentsDb.delete(id);
  return res.json({ success: true, id });
});

// API ROUTE: AI-Powered Document Search & Semantic Q&A
app.post("/api/documents/search", async (req, res) => {
  try {
    const { query, documentIds = [] } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const userId = getUserIdFromReq(req);
    const ai = getGenAIClient();

    // Fetch documents to query against
    let targetDocs = Array.from(documentsDb.values()).filter((d) => d.userId === userId);
    if (documentIds.length > 0) {
      targetDocs = targetDocs.filter((d) => documentIds.includes(d.id));
    }

    if (targetDocs.length === 0) {
      return res.json({
        answer: "No documents available in your library to answer this query. Please upload a document first.",
        sources: [],
        suggestedFollowUps: ["Upload a document", "Ask a general AI question"],
      });
    }

    // Build context corpus from documents
    const corpus = targetDocs
      .map(
        (doc) =>
          `DOCUMENT TITLE: "${doc.title}" (ID: ${doc.id})\n` +
          `SUMMARY: ${doc.summary}\n` +
          `CONTENT:\n${doc.content}\n---`
      )
      .join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `You are an intelligent document search assistant. Answer the user's search query accurately using ONLY the provided Document Knowledge Base below. Cite specific documents and quote relevant snippets.

USER SEARCH QUERY: "${query}"

DOCUMENT KNOWLEDGE BASE:
${corpus}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  documentId: { type: Type.STRING },
                  documentTitle: { type: Type.STRING },
                  snippet: { type: Type.STRING },
                  relevanceScore: { type: Type.NUMBER },
                },
                required: ["documentId", "documentTitle", "snippet"],
              },
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["answer", "sources", "suggestedFollowUps"],
        },
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");

    return res.json({
      answer: parsedResult.answer || "No matching answer found in documents.",
      sources: parsedResult.sources || [],
      suggestedFollowUps: parsedResult.suggestedFollowUps || [],
    });
  } catch (error: any) {
    console.error("Document search error:", error);
    return res.status(500).json({ error: "Failed to perform document search", details: error.message });
  }
});

// Vite Server Setup or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexus AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
