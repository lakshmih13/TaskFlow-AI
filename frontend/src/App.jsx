import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

// ================= API URLs =================

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

// ================= APP =================

function App() {
  // ================= DATA STATES =================

  const [tasks, setTasks] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================= STANDUP =================

  const [standup, setStandup] = useState("");
  const [standupLoading, setStandupLoading] =
    useState(false);

  // ================= NAVIGATION =================

  const [activeSection, setActiveSection] =
    useState("dashboard");

  // ================= TASK EDITING =================

  const [editingTask, setEditingTask] =
    useState(null);

  // ================= AI CHAT =================

  const [chatMessages, setChatMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);

  const chatEndRef = useRef(null);

  // ================= TEAM MEMBERS =================

  const [teamMembers, setTeamMembers] =
    useState(() => {
      try {
        const savedMembers =
          localStorage.getItem(
            "taskflowTeamMembers"
          );

        return savedMembers
          ? JSON.parse(savedMembers)
          : [];
      } catch {
        return [];
      }
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

  // ================= FORM =================

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

  // ================= AUTO SCROLL CHAT =================

  useEffect(() => {
    if (activeSection === "chat") {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    }
  }, [
    chatMessages,
    chatLoading,
    activeSection,
  ]);

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

      const taskData = Array.isArray(response.data)
        ? response.data
        : [];

      setTasks(taskData);

      const existingAssignees = taskData
        .map((task) => task.assignee)
        .filter(
          (assignee) =>
            assignee &&
            assignee.trim() !== ""
        )
        .map((assignee) => assignee.trim());

      setTeamMembers((prev) => {
        const combined = [
          ...prev,
          ...existingAssignees,
        ];

        return [
          ...new Map(
            combined.map((member) => [
              member.toLowerCase(),
              member,
            ])
          ).values(),
        ];
      });
    } catch (error) {
      console.error(
        "Task fetch error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH BLOCKERS =================

  const fetchBlockers = async () => {
    try {
      const response =
        await axios.get(BLOCKER_API_URL);

      setBlockers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        "Blocker fetch error:",
        error
      );
    }
  };

  // ================= FETCH ANALYTICS =================

  const fetchAnalytics = async () => {
    try {
      const response =
        await axios.get(ANALYTICS_API_URL);

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
        await axios.get(ALERTS_API_URL);

      setAlerts(response.data);
    } catch (error) {
      console.error(
        "Alert error:",
        error
      );
    }
  };

  // ================= REFRESH DATA =================

  const refreshAllData = async () => {
    await Promise.all([
      fetchTasks(),
      fetchBlockers(),
      fetchAnalytics(),
      fetchAlerts(),
    ]);
  };

  // ================= INITIAL LOAD =================

  useEffect(() => {
    refreshAllData();
  }, []);

  // ================= FORM CHANGE =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ================= RESET FORM =================

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
    setNewTeamMember("");
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

  // ================= CREATE / UPDATE TASK =================

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

      if (
        formData.assignee &&
        formData.assignee.trim() !== ""
      ) {
        setTeamMembers((prev) => {
          const exists = prev.some(
            (member) =>
              member.toLowerCase() ===
              formData.assignee
                .trim()
                .toLowerCase()
          );

          if (exists) return prev;

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
      console.error(
        "Task save error:",
        error
      );

      showNotification(
        "Failed to save task.",
        "error"
      );
    }
  };

  // ================= EDIT TASK =================

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
      due_date: task.due_date
        ? task.due_date.split("T")[0]
        : "",
      blocker:
        task.blocker || "",
    });

    if (
      task.assignee &&
      task.assignee.trim() !== ""
    ) {
      setTeamMembers((prev) => {
        const exists = prev.some(
          (member) =>
            member.toLowerCase() ===
            task.assignee.toLowerCase()
        );

        if (exists) return prev;

        return [
          ...prev,
          task.assignee,
        ];
      });
    }

    setActiveSection("add");
  };

  // ================= DELETE TASK =================

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
      console.error(
        "Delete error:",
        error
      );

      showNotification(
        "Failed to delete task.",
        "error"
      );
    }
  };

  // ================= GENERATE STANDUP =================

  const generateStandup = async () => {
    try {
      setStandupLoading(true);

      const response =
        await axios.get(STANDUP_API_URL);

      setStandup(
        response.data.standup ||
          "No standup report generated."
      );

      showNotification(
        "AI Standup generated!"
      );
    } catch (error) {
      console.error(error);

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

  // ================= SEND CHAT =================

  const sendChatMessage = async (e) => {
    e.preventDefault();

    const messageText =
      chatInput.trim();

    if (!messageText || chatLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: messageText,
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
            message: messageText,
          }
        );

      const answer =
        response.data?.answer ||
        "I could not generate an answer.";

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: answer,
        },
      ]);
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text:
            "⚠️ Sorry, I could not process your request. Please check the server and try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ================= DASHBOARD =================

  const renderDashboard = () => {
    const completedCount = tasks.filter(
      (task) =>
        task.status === "Completed"
    ).length;

    const progressCount = tasks.filter(
      (task) =>
        task.status === "In Progress"
    ).length;

    const blockedCount = tasks.filter(
      (task) =>
        task.status === "Blocked"
    ).length;

    const completionRate = tasks.length
      ? Math.round(
          (completedCount / tasks.length) * 100
        )
      : 0;

    return (
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
            onClick={async () => {
              await refreshAllData();
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
            {alerts.overdue?.length > 0 && (
              <div className="alert overdue">
                🔴 {alerts.overdue.length} task(s)
                {" "}are overdue
              </div>
            )}

            {alerts.dueTomorrow?.length > 0 && (
              <div className="alert tomorrow">
                🟠{" "}
                {alerts.dueTomorrow
                  .map((task) => task.title)
                  .join(", ")}
                {" "}due tomorrow
              </div>
            )}

            {alerts.highPriorityIncomplete > 0 && (
              <div className="alert priority">
                ⚠️{" "}
                {alerts.highPriorityIncomplete}
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
              <p>{completedCount}</p>
            </div>
          </div>

          <div className="card">
            <span>🔄</span>
            <div>
              <h3>In Progress</h3>
              <p>{progressCount}</p>
            </div>
          </div>

          <div className="card">
            <span>🚧</span>
            <div>
              <h3>Blocked</h3>
              <p>{blockedCount}</p>
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
                {completionRate}%
              </strong>
            </p>
          </div>
        </div>
      </>
    );
  };

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
            <p>{analytics.total || 0}</p>
          </div>

          <div className="analytics-card">
            <h3>Completed</h3>
            <p>{analytics.completed || 0}</p>
          </div>

          <div className="analytics-card">
            <h3>Completion Rate</h3>
            <p>
              {analytics.completionRate || 0}%
            </p>
          </div>

          <div className="analytics-card">
            <h3>Blocked</h3>
            <p>{analytics.blocked || 0}</p>
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
                    analytics.statusData || []
                  }
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {(analytics.statusData || []).map(
                    (entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
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
                  analytics.priorityData || []
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

          {(analytics.teamProductivity || [])
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
                          width:
                            `${member.productivity || 0}%`,
                        }}
                      />
                    </div>

                    <strong>
                      Productivity:{" "}
                      {member.productivity || 0}%
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
            type="button"
            onClick={() =>
              setChatInput(
                "What should I work on today?"
              )
            }
          >
            What should I work on today?
          </button>

          <button
            type="button"
            onClick={() =>
              setChatInput(
                "Which task is risky?"
              )
            }
          >
            Which task is risky?
          </button>

          <button
            type="button"
            onClick={() =>
              setChatInput(
                "Why is our project delayed?"
              )
            }
          >
            Why is our project delayed?
          </button>

          <button
            type="button"
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
              <div className="chat-welcome-icon">
                🤖
              </div>

              <h2>
                Hello! I'm TaskFlow AI
              </h2>

              <p>
                Ask me anything about your tasks,
                blockers, priorities, deadlines, or
                project progress.
              </p>
            </div>
          )}

          {chatMessages.map(
            (message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "chat-row user-row"
                    : "chat-row ai-row"
                }
              >
                {message.role === "ai" && (
                  <div className="chat-avatar">
                    🤖
                  </div>
                )}

                <div
                  className={
                    message.role === "user"
                      ? "message user-message"
                      : "message ai-message"
                  }
                >
                  {message.role === "ai" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            )
          )}

          {chatLoading && (
            <div className="chat-row ai-row">
              <div className="chat-avatar">
                🤖
              </div>

              <div className="message ai-message thinking-message">
                <span>Thinking</span>
                <span className="thinking-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <form
          className="chat-input"
          onSubmit={sendChatMessage}
        >
          <input
            type="text"
            placeholder="Ask TaskFlow AI anything..."
            value={chatInput}
            disabled={chatLoading}
            onChange={(e) =>
              setChatInput(e.target.value)
            }
          />

          <button
            type="submit"
            disabled={
              chatLoading ||
              !chatInput.trim()
            }
          >
            {chatLoading
              ? "Thinking..."
              : "Send 🚀"}
          </button>
        </form>
      </div>
    </>
  );

  // ================= ADD TASK =================

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
                      (member) => (
                        <button
                          type="button"
                          className="assignee-option"
                          key={member}
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
                        onClick={addTeamMember}
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

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                >
                  {task.recommendation ||
                    "No recommendation available."}
                </ReactMarkdown>
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {standup}
              </ReactMarkdown>
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
                <h3>{task.title}</h3>

                <span
                  className={`status-badge ${(
                    task.status || "To Do"
                  )
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

  // ================= CONTENT ROUTER =================

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

  // ================= MAIN APP =================

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

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">
        <div className="logo">
          <h2>🚀 TaskFlow</h2>

          <span>
            AI TEAM COPILOT
          </span>
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

      {/* ================= MAIN CONTENT ================= */}

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;