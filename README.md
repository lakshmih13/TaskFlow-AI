# 🚀 TaskFlow AI

## AI-Powered Task Management and Team Productivity Platform

TaskFlow AI is an intelligent task management and team productivity platform designed to help teams organize tasks, monitor project progress, identify blockers, track deadlines, and receive AI-powered insights.

The application combines traditional task management with Artificial Intelligence to provide smart recommendations, automated standup reports, blocker analysis, project analytics, and an interactive AI chat assistant.

---

## ✨ Features

### 📋 Task Management

- Create new tasks
- Edit existing tasks
- Delete tasks
- Assign tasks to team members
- Set task priority
- Track task status
- Add task descriptions
- Set due dates
- Add blocker information

### 👥 Team Management

- Select team members from a dropdown
- Add new team members directly from the assignee dropdown
- Automatically manage task assignments
- View team productivity

### 📊 Task Analytics

TaskFlow AI provides analytics for:

- Total tasks
- Completed tasks
- Tasks in progress
- Blocked tasks
- Tasks by status
- Tasks by priority
- Completion percentage
- Team productivity

### 🚧 AI Blocker Analysis

The system detects blocked tasks and uses AI to analyze:

- The problem causing the blocker
- Task priority
- Assigned team member
- Recommended actions

### 📝 AI Standup Copilot

TaskFlow AI can automatically generate a daily standup report containing:

- Completed tasks
- Tasks currently in progress
- Active blockers
- Next priorities
- Team summary

### 📅 Due Date Alerts

The system automatically identifies:

- 🔴 Overdue tasks
- 🟠 Tasks due tomorrow
- ⚠️ Incomplete high-priority tasks

These alerts help teams take action before important deadlines are missed.

### 🤖 Ask TaskFlow AI

Users can interact with an AI assistant and ask questions such as:

- What should I work on today?
- Which task is risky?
- Why is our project delayed?
- Who has the most blocked tasks?
- Which tasks are overdue?
- What are the current project priorities?

The AI analyzes the available task data and provides intelligent responses.

---

# 🏗️ System Architecture

TaskFlow AI follows a client-server architecture.

```text
                User
                  │
                  ▼
        ┌──────────────────┐
        │ React Frontend   │
        │   TaskFlow AI    │
        └────────┬─────────┘
                 │
                 │ REST API
                 ▼
        ┌──────────────────┐
        │ Node.js Backend  │
        │    Express.js    │
        └───────┬─────┬────┘
                │     │
                ▼     ▼
         ┌──────────┐ ┌──────────┐
         │PostgreSQL│ │ Groq AI  │
         │ Database │ │ Service  │
         └──────────┘ └──────────┘