const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ================= POSTGRESQL =================

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ================= GROQ AI =================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================= DATABASE TEST =================

pool.connect()
  .then((client) => {
    console.log("PostgreSQL connected successfully!");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });

// ================= HOME =================

app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow AI Backend is running!",
  });
});

// ================= GET ALL TASKS =================

app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching tasks:", error.message);

    res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

// ================= CREATE TASK =================

app.post("/api/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      assignee,
      priority,
      status,
      due_date,
      blocker,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO tasks
      (
        title,
        description,
        assignee,
        priority,
        status,
        due_date,
        blocker
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        title,
        description || null,
        assignee || null,
        priority || "Medium",
        status || "To Do",
        due_date || null,
        blocker || null,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("Error creating task:", error.message);

    res.status(500).json({
      error: "Failed to create task",
    });
  }
});

// ================= UPDATE TASK =================

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      assignee,
      priority,
      status,
      due_date,
      blocker,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        assignee = $3,
        priority = $4,
        status = $5,
        due_date = $6,
        blocker = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        title,
        description || null,
        assignee || null,
        priority || "Medium",
        status || "To Do",
        due_date || null,
        blocker || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error updating task:", error.message);

    res.status(500).json({
      error: "Failed to update task",
    });
  }
});

// ================= DELETE TASK =================

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM tasks
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.json({
      message: "Task deleted successfully",
      task: result.rows[0],
    });

  } catch (error) {
    console.error("Error deleting task:", error.message);

    res.status(500).json({
      error: "Failed to delete task",
    });
  }
});

// ================= AI BLOCKER ANALYSIS =================

app.get("/api/blockers", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM tasks
      WHERE status = 'Blocked'
      ORDER BY id DESC
      `
    );

    const blockers = [];

    for (const task of result.rows) {

      const prompt = `
Analyze this blocked software task.

Title: ${task.title}
Description: ${task.description || "Not provided"}
Assignee: ${task.assignee || "Not assigned"}
Priority: ${task.priority || "Medium"}
Blocker: ${task.blocker || "Not specified"}

Return ONLY this format:

Problem: <one sentence>

Recommended Action: <one or two practical sentences>

Maximum 80 words.
`;

      const completion =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content:
                "You are TaskFlow AI, a concise project management copilot. Give practical recommendations. Do not explain internal reasoning.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.3,
          max_tokens: 300,
        });

      const recommendation =
        completion.choices?.[0]?.message?.content?.trim()
        || "AI analysis could not be generated.";

      blockers.push({
        ...task,
        recommendation,
      });
    }

    res.json(blockers);

  } catch (error) {
    console.error(
      "AI blocker analysis error:",
      error.message
    );

    res.status(500).json({
      error: "Failed to analyze blockers",
    });
  }
});

// ================= AI STANDUP =================

app.get("/api/standup", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id DESC"
    );

    const tasks = result.rows;

    if (tasks.length === 0) {
      return res.json({
        standup:
          "No tasks are available yet. Add tasks to generate a standup report.",
      });
    }

    const taskData = tasks
      .map(
        (task) => `
Task: ${task.title}
Description: ${task.description || "Not provided"}
Assignee: ${task.assignee || "Not assigned"}
Priority: ${task.priority}
Status: ${task.status}
Due Date: ${task.due_date || "Not set"}
Blocker: ${task.blocker || "None"}
`
      )
      .join("\n-------------------\n");

    const prompt = `
You are TaskFlow AI.

Analyze these team tasks and generate a concise daily standup.

TASK DATA:

${taskData}

Return exactly:

Completed:
- ...

In Progress:
- ...

Blockers:
- ...

Next Priorities:
- ...

Team Summary:
- ...

Maximum 250 words.
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "system",
            content:
              "You are a practical AI project management copilot. Generate useful standup reports without explaining internal reasoning.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.3,
        max_tokens: 800,
      });

    const standup =
      completion.choices?.[0]?.message?.content?.trim()
      || "AI could not generate the standup report.";

    res.json({
      standup,
      totalTasks: tasks.length,
    });

  } catch (error) {
    console.error(
      "AI standup generation error:",
      error.message
    );

    res.status(500).json({
      error: "Failed to generate AI standup report",
    });
  }
});

// ================= ANALYTICS =================

app.get("/api/analytics", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks"
    );

    const tasks = result.rows;

    const total = tasks.length;

    const completed = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;

    const blocked = tasks.filter(
      (task) => task.status === "Blocked"
    ).length;

    const todo = tasks.filter(
      (task) => task.status === "To Do"
    ).length;

    const high = tasks.filter(
      (task) => task.priority === "High"
    ).length;

    const medium = tasks.filter(
      (task) => task.priority === "Medium"
    ).length;

    const low = tasks.filter(
      (task) => task.priority === "Low"
    ).length;

    const completionRate =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    const assigneeStats = {};

    tasks.forEach((task) => {
      const name =
        task.assignee || "Unassigned";

      if (!assigneeStats[name]) {
        assigneeStats[name] = {
          total: 0,
          completed: 0,
          blocked: 0,
        };
      }

      assigneeStats[name].total++;

      if (task.status === "Completed") {
        assigneeStats[name].completed++;
      }

      if (task.status === "Blocked") {
        assigneeStats[name].blocked++;
      }
    });

    const teamProductivity =
      Object.entries(assigneeStats).map(
        ([name, stats]) => ({
          name,
          total: stats.total,
          completed: stats.completed,
          blocked: stats.blocked,
          productivity:
            stats.total > 0
              ? Math.round(
                  (stats.completed /
                    stats.total) *
                    100
                )
              : 0,
        })
      );

    res.json({
      total,
      completed,
      inProgress,
      blocked,
      todo,

      completionRate,

      priority: {
        high,
        medium,
        low,
      },

      statusData: [
        {
          name: "Completed",
          value: completed,
        },
        {
          name: "In Progress",
          value: inProgress,
        },
        {
          name: "Blocked",
          value: blocked,
        },
        {
          name: "To Do",
          value: todo,
        },
      ],

      priorityData: [
        {
          name: "High",
          value: high,
        },
        {
          name: "Medium",
          value: medium,
        },
        {
          name: "Low",
          value: low,
        },
      ],

      teamProductivity,
    });

  } catch (error) {
    console.error(
      "Analytics error:",
      error.message
    );

    res.status(500).json({
      error: "Failed to generate analytics",
    });
  }
});

// ================= DUE DATE ALERTS =================

app.get("/api/alerts", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks"
    );

    const tasks = result.rows;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const overdue = [];
    const dueTomorrow = [];

    tasks.forEach((task) => {
      if (!task.due_date) return;

      if (task.status === "Completed") return;

      const dueDate =
        new Date(task.due_date);

      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        overdue.push(task);
      }

      if (
        dueDate.getTime() ===
        tomorrow.getTime()
      ) {
        dueTomorrow.push(task);
      }
    });

    const highPriorityIncomplete =
      tasks.filter(
        (task) =>
          task.priority === "High" &&
          task.status !== "Completed"
      ).length;

    res.json({
      overdue,
      dueTomorrow,
      highPriorityIncomplete,
    });

  } catch (error) {
    console.error(
      "Alert error:",
      error.message
    );

    res.status(500).json({
      error: "Failed to generate alerts",
    });
  }
});

// ================= AI CHAT =================

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id DESC"
    );

    const tasks = result.rows;

    const taskData = tasks
      .map(
        (task) => `
Title: ${task.title}
Description: ${task.description || "Not provided"}
Assignee: ${task.assignee || "Unassigned"}
Priority: ${task.priority}
Status: ${task.status}
Due Date: ${task.due_date || "Not set"}
Blocker: ${task.blocker || "None"}
`
      )
      .join("\n------------------\n");

    const prompt = `
You are TaskFlow AI, an intelligent project management assistant.

You have access to the following project task data:

${taskData || "No tasks available."}

User question:

${message}

Answer based ONLY on the provided task data.

Be helpful, practical, concise, and specific.

You can identify:
- risky tasks
- priorities
- blockers
- delayed work
- team workload
- overdue tasks
- productivity

Do not invent tasks or information.
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "system",
            content:
              "You are TaskFlow AI, a concise and intelligent project management assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.4,
        max_tokens: 700,
      });

    const answer =
      completion.choices?.[0]?.message?.content?.trim()
      || "I could not generate an answer.";

    res.json({
      answer,
    });

  } catch (error) {
    console.error(
      "AI chat error:",
      error.message
    );

    res.status(500).json({
      error: "Failed to process AI request",
    });
  }
});

// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `TaskFlow AI server running on port ${PORT}`
  );
});