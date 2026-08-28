import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:5000/api/tasks";
const BLOCKER_API_URL =
  "http://localhost:5000/api/blockers";
const STANDUP_API_URL =
  "http://localhost:5000/api/standup";
const ANALYTICS_API_URL =
  "http://localhost:5000/api/analytics";
const ALERTS_API_URL =
  "http://localhost:5000/api/alerts";
const CHAT_API_URL =
  "http://localhost:5000/api/chat";

function App() {
  const [tasks, setTasks] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState(null);

  const [loading, setLoading] = useState(true);

  const [standup, setStandup] = useState("");
  const [standupLoading, setStandupLoading] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [editingTask, setEditingTask] =
    useState(null);

  const [chatMessages, setChatMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);

  // ================= TEAM MEMBER STATES =================

  const [teamMembers, setTeamMembers] =
    useState(() => {
      const savedMembers =
        localStorage.getItem("taskflowTeamMembers");

      return savedMembers
        ? JSON.parse(savedMembers)
        : [];
    });

  const [assigneeDropdownOpen, setAssigneeDropdownOpen] =
    useState(false);

  const [showAddMemberInput, setShowAddMemberInput] =
    useState(false);

  const [newTeamMember, setNewTeamMember] =
    useState("");

  const assigneeDropdownRef = useRef(null);

  // ================= NOTIFICATION =================

  const [notification, setNotification] =
    useState({
      show: false,
      message: "",
      type: "success",
    });

  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      assignee: "",
      priority: "Medium",
      status: "To Do",
      due_date: "",
      blocker: "",
    });

  // ================= CLICK OUTSIDE DROPDOWN =================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(
          event.target
        )
      ) {
        setAssigneeDropdownOpen(false);
        setShowAddMemberInput(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // ================= SAVE TEAM MEMBERS =================

  useEffect(() => {
    localStorage.setItem(
      "taskflowTeamMembers",
      JSON.stringify(teamMembers)
    );
  }, [teamMembers]);

  // ================= NOTIFICATION =================

  const showNotification = (
    message,
    type = "success"
  ) => {
    setNotification({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setNotification((prev) => ({
        ...prev,
        show: false,
      }));
    }, 3500);
  };

  // ================= FETCH TASKS =================

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response =
        await axios.get(API_URL);

      setTasks(response.data);

      // Add existing assignees automatically
      const existingAssignees =
        response.data
          .map((task) => task.assignee)
          .filter(
            (assignee) =>
              assignee &&
              assignee.trim() !== ""
          );

      setTeamMembers((prev) => {
        const combined = [
          ...prev,
          ...existingAssignees,
        ];

        return [...new Set(combined)];
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH BLOCKERS =================

  const fetchBlockers = async () => {
    try {
      const response =
        await axios.get(
          BLOCKER_API_URL
        );

      setBlockers(response.data);

    } catch (error) {
      console.error(error);
    }
  };

  // ================= FETCH ANALYTICS =================

  const fetchAnalytics = async () => {
    try {
      const response =
        await axios.get(
          ANALYTICS_API_URL
        );

      setAnalytics(response.data);

    } catch (error) {
      console.error(
        "Analytics error:",
        error
      );
    }
  };

  // ================= FETCH ALERTS =================

  const fetchAlerts = async () => {
    try {
      const response =
        await axios.get(
          ALERTS_API_URL
        );

      setAlerts(response.data);

    } catch (error) {
      console.error(
        "Alert error:",
        error
      );
    }
  };

  // ================= LOAD DATA =================

  const refreshAllData = async () => {
    await Promise.all([
      fetchTasks(),
      fetchBlockers(),
      fetchAnalytics(),
      fetchAlerts(),
    ]);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // ================= FORM =================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignee: "",
      priority: "Medium",
      status: "To Do",
      due_date: "",
      blocker: "",
    });

    setEditingTask(null);

    setAssigneeDropdownOpen(false);
    setShowAddMemberInput(false);
  };

  // ================= SELECT TEAM MEMBER =================

  const selectTeamMember = (member) => {
    setFormData((prev) => ({
      ...prev,
      assignee: member,
    }));

    setAssigneeDropdownOpen(false);
    setShowAddMemberInput(false);
  };

  // ================= ADD TEAM MEMBER =================

  const addTeamMember = () => {
    const memberName =
      newTeamMember.trim();

    if (!memberName) {
      showNotification(
        "Please enter a team member name.",
        "error"
      );
      return;
    }

    const alreadyExists =
      teamMembers.some(
        (member) =>
          member.toLowerCase() ===
          memberName.toLowerCase()
      );

    if (!alreadyExists) {
      setTeamMembers((prev) => [
        ...prev,
        memberName,
      ]);
    }

    setFormData((prev) => ({
      ...prev,
      assignee: memberName,
    }));

    setNewTeamMember("");

    setShowAddMemberInput(false);

    setAssigneeDropdownOpen(false);

    showNotification(
      `${memberName} added as a team member!`
    );
  };

  // ================= CREATE / UPDATE =================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingTask) {
        await axios.put(
          `${API_URL}/${editingTask.id}`,
          formData
        );

        showNotification(
          "Task updated successfully!"
        );

      } else {
        await axios.post(
          API_URL,
          formData
        );

        showNotification(
          "Task created successfully!"
        );
      }

      // Add selected assignee to team list
      if (
        formData.assignee &&
        formData.assignee.trim() !== ""
      ) {
        setTeamMembers((prev) => {
          if (
            prev.some(
              (member) =>
                member.toLowerCase() ===
                formData.assignee
                  .trim()
                  .toLowerCase()
            )
          ) {
            return prev;
          }

          return [
            ...prev,
            formData.assignee.trim(),
          ];
        });
      }

      resetForm();

      await refreshAllData();

      setStandup("");

      setActiveSection("tasks");

    } catch (error) {
      console.error(error);

      showNotification(
        "Failed to save task.",
        "error"
      );
    }
  };

  // ================= EDIT =================

  const handleEdit = (task) => {
    setEditingTask(task);

    setFormData({
      title: task.title || "",
      description:
        task.description || "",
      assignee:
        task.assignee || "",
      priority:
        task.priority || "Medium",
      status:
        task.status || "To Do",
      due_date:
        task.due_date
          ? task.due_date.split("T")[0]
          : "",
      blocker:
        task.blocker || "",
    });

    // Make sure edited assignee exists in list
    if (
      task.assignee &&
      task.assignee.trim() !== ""
    ) {
      setTeamMembers((prev) => {
        if (prev.includes(task.assignee)) {
          return prev;
        }

        return [
          ...prev,
          task.assignee,
        ];
      });
    }

    setActiveSection("add");
  };

  // ================= DELETE =================

  const handleDelete = async (id) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this task?"
      );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_URL}/${id}`
      );

      showNotification(
        "Task deleted successfully!"
      );

      await refreshAllData();

    } catch (error) {
      console.error(error);

      showNotification(
        "Failed to delete task.",
        "error"
      );
    }
  };

  // ================= STANDUP =================

  const generateStandup = async () => {
    try {
      setStandupLoading(true);

      const response =
        await axios.get(
          STANDUP_API_URL
        );

      setStandup(
        response.data.standup
      );

      showNotification(
        "AI Standup generated!"
      );

    } catch (error) {
      setStandup(
        "Failed to generate AI standup report."
      );

      showNotification(
        "Failed to generate standup.",
        "error"
      );

    } finally {
      setStandupLoading(false);
    }
  };

  // ================= AI CHAT =================

  const sendChatMessage = async (e) => {
    e.preventDefault();

    if (!chatInput.trim()) return;

    const userMessage = {
      role: "user",
      text: chatInput,
    };

    setChatMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setChatInput("");

    setChatLoading(true);

    try {
      const response =
        await axios.post(
          CHAT_API_URL,
          {
            message: userMessage.text,
          }
        );

      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: response.data.answer,
        },
      ]);

    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            "Sorry, I could not process your request.",
        },
      ]);

    } finally {
      setChatLoading(false);
    }
  };

  // ================= DASHBOARD =================

  const renderDashboard = () => (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of your team's work and productivity.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => {
            refreshAllData();
            showNotification(
              "Dashboard refreshed!"
            );
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {alerts && (
        <div className="alert-summary">

          {alerts.overdue.length > 0 && (
            <div className="alert overdue">
              🔴 {alerts.overdue.length} task(s)
              {" "}are overdue
            </div>
          )}

          {alerts.dueTomorrow.length > 0 && (
            <div className="alert tomorrow">
              🟠 {alerts.dueTomorrow
                .map((task) => task.title)
                .join(", ")}
              {" "}is due tomorrow
            </div>
          )}

          {alerts.highPriorityIncomplete > 0 && (
            <div className="alert priority">
              ⚠️ {alerts.highPriorityIncomplete}
              {" "}high-priority task(s) are incomplete
            </div>
          )}

        </div>
      )}

      <div className="stats">

        <div className="card">
          <span>📋</span>
          <div>
            <h3>Total Tasks</h3>
            <p>{tasks.length}</p>
          </div>
        </div>

        <div className="card">
          <span>✅</span>
          <div>
            <h3>Completed</h3>
            <p>
              {
                tasks.filter(
                  (task) =>
                    task.status === "Completed"
                ).length
              }
            </p>
          </div>
        </div>

        <div className="card">
          <span>🔄</span>
          <div>
            <h3>In Progress</h3>
            <p>
              {
                tasks.filter(
                  (task) =>
                    task.status ===
                    "In Progress"
                ).length
              }
            </p>
          </div>
        </div>

        <div className="card">
          <span>🚧</span>
          <div>
            <h3>Blocked</h3>
            <p>
              {
                tasks.filter(
                  (task) =>
                    task.status === "Blocked"
                ).length
              }
            </p>
          </div>
        </div>

      </div>

      <div className="dashboard-grid">

        <div className="dashboard-panel">
          <h2>🚧 Active Blockers</h2>

          {blockers.length === 0 ? (
            <p className="empty-state">
              🎉 No active blockers!
            </p>
          ) : (
            blockers
              .slice(0, 3)
              .map((task) => (
                <div
                  className="mini-blocker"
                  key={task.id}
                >
                  <strong>
                    {task.title}
                  </strong>

                  <p>
                    {task.blocker ||
                      "No blocker description"}
                  </p>
                </div>
              ))
          )}
        </div>

        <div className="dashboard-panel">
          <h2>⚡ Quick Overview</h2>

          <p>
            Total tasks:{" "}
            <strong>
              {tasks.length}
            </strong>
          </p>

          <p>
            Completion rate:{" "}
            <strong>
              {tasks.length
                ? Math.round(
                    (tasks.filter(
                      (task) =>
                        task.status ===
                        "Completed"
                    ).length /
                      tasks.length) *
                      100
                  )
                : 0}
              %
            </strong>
          </p>
        </div>

      </div>
    </>
  );

  // ================= ANALYTICS =================

  const renderAnalytics = () => {
    if (!analytics) {
      return <p>Loading analytics...</p>;
    }

    const COLORS = [
      "#2563eb",
      "#22c55e",
      "#f97316",
      "#94a3b8",
    ];

    return (
      <>
        <div className="page-header">
          <div>
            <h1>📊 Task Analytics</h1>
            <p>
              Visual insights into project performance.
            </p>
          </div>
        </div>

        <div className="analytics-summary">

          <div className="analytics-card">
            <h3>Total Tasks</h3>
            <p>{analytics.total}</p>
          </div>

          <div className="analytics-card">
            <h3>Completed</h3>
            <p>{analytics.completed}</p>
          </div>

          <div className="analytics-card">
            <h3>Completion Rate</h3>
            <p>
              {analytics.completionRate}%
            </p>
          </div>

          <div className="analytics-card">
            <h3>Blocked</h3>
            <p>{analytics.blocked}</p>
          </div>

        </div>

        <div className="charts-grid">

          <div className="chart-card">
            <h2>Tasks by Status</h2>

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>
                <Pie
                  data={
                    analytics.statusData
                  }
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.statusData.map(
                    (entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h2>Tasks by Priority</h2>

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={
                  analytics.priorityData
                }
              >
                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="value"
                  name="Tasks"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        <div className="productivity-section">

          <h2>
            👥 Team Productivity
          </h2>

          {analytics.teamProductivity
            .length === 0 ? (
            <p>No team data available.</p>
          ) : (
            <div className="productivity-list">

              {analytics.teamProductivity.map(
                (member) => (
                  <div
                    className="productivity-card"
                    key={member.name}
                  >
                    <h3>
                      👤 {member.name}
                    </h3>

                    <p>
                      Tasks: {member.total}
                    </p>

                    <p>
                      Completed:{" "}
                      {member.completed}
                    </p>

                    <p>
                      Blocked:{" "}
                      {member.blocked}
                    </p>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${member.productivity}%`,
                        }}
                      />
                    </div>

                    <strong>
                      Productivity:{" "}
                      {member.productivity}%
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </div>
      </>
    );
  };

  // ================= AI CHAT =================

  const renderChat = () => (
    <>
      <div className="page-header">
        <div>
          <h1>🤖 Ask TaskFlow AI</h1>
          <p>
            Ask questions about your project and team.
          </p>
        </div>
      </div>

      <div className="chat-container">

        <div className="chat-suggestions">
          <button
            onClick={() =>
              setChatInput(
                "What should I work on today?"
              )
            }
          >
            What should I work on today?
          </button>

          <button
            onClick={() =>
              setChatInput(
                "Which task is risky?"
              )
            }
          >
            Which task is risky?
          </button>

          <button
            onClick={() =>
              setChatInput(
                "Why is our project delayed?"
              )
            }
          >
            Why is our project delayed?
          </button>

          <button
            onClick={() =>
              setChatInput(
                "Who has the most blocked tasks?"
              )
            }
          >
            Who has the most blocked tasks?
          </button>
        </div>

        <div className="chat-messages">

          {chatMessages.length === 0 && (
            <div className="chat-welcome">
              🤖 Hello! I'm TaskFlow AI.

              <br />

              Ask me anything about your project.
            </div>
          )}

          {chatMessages.map(
            (message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "message user-message"
                    : "message ai-message"
                }
              >
                {message.text}
              </div>
            )
          )}

          {chatLoading && (
            <div className="message ai-message">
              🤖 Thinking...
            </div>
          )}

        </div>

        <form
          className="chat-input"
          onSubmit={sendChatMessage}
        >
          <input
            type="text"
            placeholder="Ask TaskFlow AI..."
            value={chatInput}
            onChange={(e) =>
              setChatInput(
                e.target.value
              )
            }
          />

          <button type="submit">
            Send 🚀
          </button>
        </form>

      </div>
    </>
  );

  // ================= ADD / EDIT =================

  const renderAddTask = () => (
    <>
      <div className="page-header">
        <div>
          <h1>
            {editingTask
              ? "✏️ Edit Task"
              : "➕ Add New Task"}
          </h1>

          <p>
            {editingTask
              ? "Update the selected task."
              : "Create and assign work to your team."}
          </p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>

          <input
            type="text"
            name="title"
            placeholder="Task title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Task description"
            value={formData.description}
            onChange={handleChange}
          />

          {/* ================= ASSIGNEE DROPDOWN ================= */}

          <div
            className="assignee-dropdown-container"
            ref={assigneeDropdownRef}
          >
            <button
              type="button"
              className="assignee-dropdown-button"
              onClick={() =>
                setAssigneeDropdownOpen(
                  (prev) => !prev
                )
              }
            >
              <span>
                {formData.assignee
                  ? `👤 ${formData.assignee}`
                  : "👤 Select Assignee"}
              </span>

              <span>
                {assigneeDropdownOpen
                  ? "▲"
                  : "▼"}
              </span>
            </button>

            {assigneeDropdownOpen && (
              <div className="assignee-dropdown-menu">

                <div className="assignee-list">

                  {teamMembers.length === 0 ? (
                    <div className="no-members">
                      No team members yet
                    </div>
                  ) : (
                    teamMembers.map(
                      (member, index) => (
                        <button
                          type="button"
                          className="assignee-option"
                          key={index}
                          onClick={() =>
                            selectTeamMember(member)
                          }
                        >
                          👤 {member}
                        </button>
                      )
                    )
                  )}

                </div>

                {!showAddMemberInput ? (
                  <button
                    type="button"
                    className="add-member-button"
                    onClick={() =>
                      setShowAddMemberInput(true)
                    }
                  >
                    ➕ Add Team Member
                  </button>
                ) : (
                  <div className="add-member-box">
                    <input
                      type="text"
                      placeholder="Enter member name"
                      value={newTeamMember}
                      autoFocus
                      onChange={(e) =>
                        setNewTeamMember(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter"
                        ) {
                          e.preventDefault();
                          addTeamMember();
                        }
                      }}
                    />

                    <div className="member-buttons">
                      <button
                        type="button"
                        className="save-member-button"
                        onClick={
                          addTeamMember
                        }
                      >
                        Add
                      </button>

                      <button
                        type="button"
                        className="cancel-member-button"
                        onClick={() => {
                          setShowAddMemberInput(
                            false
                          );
                          setNewTeamMember("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option>To Do</option>
            <option>In Progress</option>
            <option>Blocked</option>
            <option>Completed</option>
          </select>

          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
          />

          <textarea
            name="blocker"
            placeholder="Describe blocker (if any)"
            value={formData.blocker}
            onChange={handleChange}
          />

          <div className="form-actions">

            <button type="submit">
              {editingTask
                ? "💾 Update Task"
                : "🚀 Create Task"}
            </button>

            {editingTask && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  resetForm();
                  setActiveSection("tasks");
                }}
              >
                Cancel
              </button>
            )}

          </div>

        </form>
      </div>
    </>
  );

  // ================= BLOCKERS =================

  const renderBlockers = () => (
    <>
      <div className="page-header">
        <div>
          <h1>🚧 Active Blockers</h1>
          <p>
            AI-powered blocker analysis.
          </p>
        </div>
      </div>

      {blockers.length === 0 ? (
        <div className="empty-state-box">
          🎉 No active blockers!
        </div>
      ) : (
        <div className="blocker-list">

          {blockers.map((task) => (
            <div
              className="blocker-card"
              key={task.id}
            >
              <h3>{task.title}</h3>

              <p>
                <strong>Blocker:</strong>{" "}
                {task.blocker ||
                  "Not specified"}
              </p>

              <p>
                <strong>Assignee:</strong>{" "}
                {task.assignee ||
                  "Not assigned"}
              </p>

              <div className="ai-recommendation">
                <strong>
                  🤖 AI Recommendation
                </strong>

                <p>
                  {task.recommendation}
                </p>
              </div>
            </div>
          ))}

        </div>
      )}
    </>
  );

  // ================= STANDUP =================

  const renderStandup = () => (
    <>
      <div className="page-header">
        <div>
          <h1>📝 AI Standup Copilot</h1>

          <p>
            Generate an intelligent summary of your team.
          </p>
        </div>
      </div>

      <div className="standup-section">

        <button
          className="standup-button"
          onClick={generateStandup}
          disabled={standupLoading}
        >
          {standupLoading
            ? "🤖 Generating AI Report..."
            : "✨ Generate Today's Standup"}
        </button>

        {standup && (
          <div className="standup-report">

            <h2>
              🤖 AI Standup Report
            </h2>

            <div className="standup-content">
              {standup}
            </div>

          </div>
        )}

      </div>
    </>
  );

  // ================= TASKS =================

  const renderTasks = () => (
    <>
      <div className="page-header">
        <div>
          <h1>📋 My Tasks</h1>

          <p>
            View, edit and manage all tasks.
          </p>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="empty-state-box">
          📭 No tasks found.
        </div>
      ) : (
        <div className="task-list">

          {tasks.map((task) => (
            <div
              className="task-card"
              key={task.id}
            >

              <div className="task-card-header">

                <h3>
                  {task.title}
                </h3>

                <span
                  className={`status-badge ${task.status
                    .toLowerCase()
                    .replace(/\s/g, "-")}`}
                >
                  {task.status}
                </span>

              </div>

              <p>
                {task.description ||
                  "No description provided."}
              </p>

              <div className="task-info">

                <span>
                  👤{" "}
                  {task.assignee ||
                    "Unassigned"}
                </span>

                <span>
                  🔥 {task.priority}
                </span>

                {task.due_date && (
                  <span>
                    📅{" "}
                    {new Date(
                      task.due_date
                    ).toLocaleDateString()}
                  </span>
                )}

              </div>

              <div className="task-actions">

                <button
                  className="edit-button"
                  onClick={() =>
                    handleEdit(task)
                  }
                >
                  ✏️ Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() =>
                    handleDelete(task.id)
                  }
                >
                  🗑 Delete
                </button>

              </div>

            </div>
          ))}

        </div>
      )}
    </>
  );

  // ================= CONTENT =================

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();

      case "add":
        return renderAddTask();

      case "tasks":
        return renderTasks();

      case "blockers":
        return renderBlockers();

      case "standup":
        return renderStandup();

      case "analytics":
        return renderAnalytics();

      case "chat":
        return renderChat();

      default:
        return renderDashboard();
    }
  };

  // ================= APP =================

  return (
    <div className="app-layout">

      {notification.show && (
        <div
          className={`notification ${notification.type}`}
        >
          <span>
            {notification.type === "success"
              ? "✓"
              : "!"}
          </span>

          {notification.message}
        </div>
      )}

      <aside className="sidebar">

        <div className="logo">
          <h2>🚀 TaskFlow</h2>
          <span>AI TEAM COPILOT</span>
        </div>

        <nav className="nav-menu">

          <button
            className={
              activeSection === "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            className={
              activeSection === "add"
                ? "active"
                : ""
            }
            onClick={() => {
              resetForm();
              setActiveSection("add");
            }}
          >
            ➕ Add Task
          </button>

          <button
            className={
              activeSection === "tasks"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("tasks")
            }
          >
            📋 My Tasks
          </button>

          <button
            className={
              activeSection === "blockers"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("blockers")
            }
          >
            🚧 Blockers
          </button>

          <button
            className={
              activeSection === "standup"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("standup")
            }
          >
            📝 AI Standup
          </button>

          <button
            className={
              activeSection === "analytics"
                ? "active"
                : ""
            }
            onClick={() => {
              fetchAnalytics();
              setActiveSection("analytics");
            }}
          >
            📈 Analytics
          </button>

          <button
            className={
              activeSection === "chat"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("chat")
            }
          >
            🤖 Ask TaskFlow AI
          </button>

        </nav>

        <div className="sidebar-footer">
          🤖 Powered by Groq AI
        </div>

      </aside>

      <main className="main-content">
        {renderContent()}
      </main>

    </div>
  );
}

export default App;