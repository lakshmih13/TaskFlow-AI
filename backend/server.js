const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// POSTGRESQL DATABASE
// ======================================================

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ======================================================
// GROQ AI
// ======================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ======================================================
// DATABASE CONNECTION TEST
// ======================================================

pool.connect()
  .then((client) => {
    console.log("PostgreSQL connected successfully!");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function normalizeDate(date) {
  if (!date) return null;

  const newDate = new Date(date);

  if (isNaN(newDate.getTime())) {
    return null;
  }

  newDate.setHours(0, 0, 0, 0);

  return newDate;
}

function formatDate(date) {
  if (!date) return "Not set";

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return "Not set";
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function getTaskRisk(task) {
  let score = 0;
  const reasons = [];

  const today = getToday();
  const dueDate = normalizeDate(task.due_date);

  // Priority
  if (task.priority === "High") {
    score += 3;
    reasons.push("High priority");
  }

  if (task.priority === "Medium") {
    score += 1;
  }

  // Status
  if (task.status === "Blocked") {
    score += 4;
    reasons.push("Currently blocked");
  }

  if (task.status === "In Progress") {
    score += 1;
  }

  // Explicit blocker
  if (
    task.blocker &&
    task.blocker.trim() !== "" &&
    task.blocker.toLowerCase() !== "none"
  ) {
    score += 3;
    reasons.push("Has an unresolved blocker");
  }

  // Due date
  if (dueDate && task.status !== "Completed") {
    if (dueDate < today) {
      score += 5;
      reasons.push("Overdue");
    } else {
      const diff =
        Math.floor(
          (dueDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
        );

      if (diff === 0) {
        score += 4;
        reasons.push("Due today");
      } else if (diff === 1) {
        score += 3;
        reasons.push("Due tomorrow");
      } else if (diff <= 3) {
        score += 2;
        reasons.push("Due soon");
      }
    }
  }

  let level = "Low";

  if (score >= 8) {
    level = "Critical";
  } else if (score >= 5) {
    level = "High";
  } else if (score >= 3) {
    level = "Medium";
  }

  return {
    score,
    level,
    reasons,
  };
}

function createTaskData(tasks) {
  return tasks
    .map((task, index) => {
      const risk = getTaskRisk(task);

      return `
TASK ${index + 1}

Title: ${task.title || "Not provided"}
Description: ${task.description || "Not provided"}
Assignee: ${task.assignee || "Unassigned"}
Priority: ${task.priority || "Medium"}
Status: ${task.status || "To Do"}
Due Date: ${formatDate(task.due_date)}
Blocker: ${task.blocker || "None"}
Risk Level: ${risk.level}
Risk Reasons: ${risk.reasons.join(", ") || "No major risk detected"}
`;
    })
    .join("\n-----------------------------------\n");
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow AI Backend is running!",
  });
});

// ======================================================
// GET ALL TASKS
// ======================================================

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

// ======================================================
// CREATE TASK
// ======================================================

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

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Task title is required",
      });
    }

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
        title.trim(),
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

// ======================================================
// UPDATE TASK
// ======================================================

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

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Task title is required",
      });
    }

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
        title.trim(),
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

// ======================================================
// DELETE TASK
// ======================================================

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

// ======================================================
// AI BLOCKER ANALYSIS
// ======================================================

app.get("/api/blockers", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM tasks
      WHERE
        status = 'Blocked'
        OR (
          blocker IS NOT NULL
          AND blocker <> ''
          AND LOWER(blocker) <> 'none'
        )
      ORDER BY id DESC
      `
    );

    const blockers = [];

    for (const task of result.rows) {
      const risk = getTaskRisk(task);

      const prompt = `
Analyze this project task.

Task:
Title: ${task.title}
Assignee: ${task.assignee || "Unassigned"}
Priority: ${task.priority}
Status: ${task.status}
Due Date: ${formatDate(task.due_date)}
Blocker: ${task.blocker || "Not specified"}

Risk Level: ${risk.level}

Return exactly:

### Problem
Briefly explain the problem.

### Impact
Explain how this may affect the project.

### Recommended Action
Give 2 practical actions.

Do not invent missing information.
Maximum 120 words.
`;

      try {
        const completion =
          await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",

            messages: [
              {
                role: "system",
                content:
                  "You are TaskFlow AI, a professional project management assistant. Provide concise and practical recommendations.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],

            temperature: 0.2,
            max_tokens: 400,
          });

        const recommendation =
          completion.choices?.[0]?.message?.content?.trim()
          || "AI analysis could not be generated.";

        blockers.push({
          ...task,
          risk,
          recommendation,
        });

      } catch (aiError) {
        blockers.push({
          ...task,
          risk,
          recommendation:
            "AI analysis is temporarily unavailable. Review the blocker and resolve it as soon as possible.",
        });
      }
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

// ======================================================
// AI DAILY STANDUP
// ======================================================

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

    const taskData = createTaskData(tasks);

    const prompt = `
You are TaskFlow AI.

Generate a professional daily project standup using ONLY the task data below.

TASK DATA:

${taskData}

Return exactly in this format:

## Completed
- List completed tasks.

## In Progress
- List tasks currently being worked on.

## Blockers
- List blocked tasks or tasks with blockers.

## Today's Priorities
- Identify the most important tasks to focus on.

## Team Summary
- Give a short summary of project health.

Do not invent information.
If a category has no tasks, write "None".
Maximum 300 words.
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "system",
            content:
              "You are TaskFlow AI, a professional project management assistant. Generate structured, concise, data-based standup reports.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,
        max_tokens: 900,
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

// ======================================================
// ANALYTICS
// ======================================================

app.get("/api/analytics", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks"
    );

    const tasks = result.rows;

    const total = tasks.length;

    const completed =
      tasks.filter(
        (task) => task.status === "Completed"
      ).length;

    const inProgress =
      tasks.filter(
        (task) => task.status === "In Progress"
      ).length;

    const blocked =
      tasks.filter(
        (task) => task.status === "Blocked"
      ).length;

    const todo =
      tasks.filter(
        (task) => task.status === "To Do"
      ).length;

    const high =
      tasks.filter(
        (task) => task.priority === "High"
      ).length;

    const medium =
      tasks.filter(
        (task) => task.priority === "Medium"
      ).length;

    const low =
      tasks.filter(
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
          highPriority: 0,
        };
      }

      assigneeStats[name].total++;

      if (task.status === "Completed") {
        assigneeStats[name].completed++;
      }

      if (task.status === "Blocked") {
        assigneeStats[name].blocked++;
      }

      if (task.priority === "High") {
        assigneeStats[name].highPriority++;
      }
    });

    const teamProductivity =
      Object.entries(assigneeStats)
        .map(([name, stats]) => ({
          name,
          total: stats.total,
          completed: stats.completed,
          blocked: stats.blocked,
          highPriority: stats.highPriority,
          productivity:
            stats.total > 0
              ? Math.round(
                  (stats.completed / stats.total) * 100
                )
              : 0,
        }))
        .sort(
          (a, b) =>
            b.total - a.total
        );

    const riskTasks =
      tasks
        .filter(
          (task) => task.status !== "Completed"
        )
        .map((task) => ({
          ...task,
          risk: getTaskRisk(task),
        }))
        .sort(
          (a, b) =>
            b.risk.score - a.risk.score
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
      riskTasks,
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

// ======================================================
// DUE DATE ALERTS
// ======================================================

app.get("/api/alerts", async (req, res) => {
  try {
    const result =
      await pool.query(
        "SELECT * FROM tasks"
      );

    const tasks = result.rows;

    const today = getToday();

    const tomorrow = new Date(today);
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const overdue = [];
    const dueToday = [];
    const dueTomorrow = [];
    const highRisk = [];

    tasks.forEach((task) => {
      if (task.status === "Completed") {
        return;
      }

      const risk = getTaskRisk(task);

      if (
        risk.level === "Critical" ||
        risk.level === "High"
      ) {
        highRisk.push({
          ...task,
          risk,
        });
      }

      if (!task.due_date) {
        return;
      }

      const dueDate =
        normalizeDate(task.due_date);

      if (!dueDate) {
        return;
      }

      if (dueDate < today) {
        overdue.push(task);
      }

      if (
        dueDate.getTime() ===
        today.getTime()
      ) {
        dueToday.push(task);
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
      );

    res.json({
      overdue,
      dueToday,
      dueTomorrow,
      highPriorityIncomplete,
      highRisk,
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

// ======================================================
// AI CHAT
// ======================================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const result =
      await pool.query(
        "SELECT * FROM tasks ORDER BY id DESC"
      );

    const tasks = result.rows;

    if (tasks.length === 0) {
      return res.json({
        answer:
          "## No Tasks Available\n\nThere are currently no tasks in the project. Please add tasks first.",
      });
    }

    const taskData =
      createTaskData(tasks);

    const prompt = `
You are TaskFlow AI, an intelligent project management assistant.

You MUST answer ONLY using the project task data provided below.

PROJECT TASK DATA:

${taskData}

USER QUESTION:

"${message}"

==================================================

STRICT RULES

1. Answer ONLY using the provided task data.
2. NEVER invent tasks, deadlines, blockers, people, or project information.
3. If information is unavailable, clearly say:
   "This information is not available in the current task data."
4. Do not say "I could not generate an answer."
5. Always provide a useful answer when possible.
6. Be concise but informative.
7. Use Markdown formatting.
8. Use tables when comparing multiple tasks.
9. Do not explain internal reasoning.
10. Base conclusions directly on task priority, status, blocker, and due date.

==================================================

QUESTION-SPECIFIC GUIDELINES

IF USER ASKS:
"Which task is risky?"
"What are the risky tasks?"
"What is the most critical task?"

Use:

## ⚠️ Risk Analysis

| Task | Assignee | Priority | Status | Due Date | Risk Level |
|------|----------|----------|--------|----------|------------|

Then:

### 🔴 Most Critical Task

Name the highest-risk task.

### Why It Is Risky

- Priority
- Status
- Blocker
- Deadline

### Recommended Action

Give practical next steps.

==================================================

IF USER ASKS:
"What should I work on today?"
"What should the team do today?"
"Today's priorities?"

Prioritize tasks in this order:

1. Overdue tasks
2. Tasks due today
3. Blocked high-priority tasks
4. High-priority tasks due soon
5. Other in-progress tasks

Use:

## 📌 Today's Priorities

| Priority | Task | Assignee | Status | Due Date | Action |
|----------|------|----------|--------|----------|--------|

Then:

### Recommended Focus

Give the top 3 actions.

If no task is due today, recommend the highest-risk incomplete tasks.

==================================================

IF USER ASKS:
"Why is our project delayed?"
"What is causing delay?"

Use:

## 🚨 Project Delay Analysis

| Issue | Affected Task | Impact |
|-------|---------------|--------|

Then:

### Main Cause

Explain the main cause based on actual task data.

### Immediate Actions

Give practical actions.

==================================================

IF USER ASKS:
"Who has the most blocked tasks?"
"Who has the highest workload?"

Use:

## 👥 Team Workload Analysis

| Assignee | Total Tasks | Blocked | High Priority |
|----------|-------------|---------|---------------|

Then clearly state the answer.

==================================================

FOR ALL OTHER QUESTIONS:

Use the most suitable format:

- Clear heading
- Bullet points
- Tables if multiple tasks are compared
- Short conclusion

Always answer based only on the task data.
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "system",
            content:
              "You are TaskFlow AI, a reliable and structured project management assistant. Always answer using only provided project data. Never invent information. Never expose internal reasoning.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,
        max_tokens: 1000,
      });

    let answer =
      completion.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      answer =
        "## Unable to Generate Response\n\nThe AI service returned an empty response. Please try asking the question again.";
    }

    res.json({
      answer,
    });

  } catch (error) {
    console.error(
      "AI chat error:",
      error.message
    );

    res.status(500).json({
      error:
        "AI service temporarily unavailable. Please try again.",
    });
  }
});

// ======================================================
// START SERVER
// ======================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `TaskFlow AI server running on port ${PORT}`
  );
});