import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";
import { connectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";
import { ClassroomDetail } from "../components/ClassroomDetail";
import { ExamEditor } from "../components/ExamEditor";

type DashboardData = {
  students: number;
  classrooms: number;
  exams: number;
  flagged: number;
  terminated: number;
};

type Student = {
  id: string;
  name: string;
  status: string;
  cameraVerified: boolean;
  phoneLinked: boolean;
};

type User = {
  id: string;
  name: string;
  role: "admin" | "student";
  classroomId?: string;
};

type NewUserCredentials = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
};

type Classroom = {
  id: string;
  name: string;
};

type DeletedItem = {
  id: string;
  type: "exam" | "question";
  data: any;
  deletedAt: string;
  deletedBy: string;
};

type Exam = {
  id: string;
  title: string;
  code: string;
  isActive: boolean;
  timeLimitMinutes: number;
  classroomIds?: string[];
  questions?: Question[];
};

type Question = {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  points: number;
};

export function AdminPage(props: { auth: AuthState | null; onLogout: () => void }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [lastEvent, setLastEvent] = useState<string>("No realtime events yet.");
  const [error, setError] = useState<string | null>(null);
  
  // Determine active view from URL
  const getActiveView = (): "overview" | "users" | "classrooms" | "students" | "exams" | "recycleBin" => {
    const path = location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/classrooms')) return 'classrooms';
    if (path.includes('/students')) return 'students';
    if (path.includes('/exams')) return 'exams';
    if (path.includes('/recycle-bin')) return 'recycleBin';
    return 'overview';
  };
  const activeView = getActiveView();
  
  // Check if we're in exam editor mode
  const isEditingExam = location.pathname.includes('/exams/edit/');
  const isCreatingExam = location.pathname === '/admin/exams/create';
  const editingExamId = isEditingExam ? location.pathname.split('/').pop() : null;
  
  // User creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"student" | "admin">("student");
  const [newUserClassroom, setNewUserClassroom] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<NewUserCredentials | null>(null);
  
  // Classroom management state
  const [showClassroomForm, setShowClassroomForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<{ id: string; name: string } | null>(null);
  const [classroomName, setClassroomName] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
  
  // Custom modal states
  const [alertModal, setAlertModal] = useState({ show: false, message: "" });
  const [confirmModal, setConfirmModal] = useState<{ show: false } | { show: true; message: string; onConfirm: () => void }>({ show: false });
  const [passwordResetModal, setPasswordResetModal] = useState<{ show: false } | { show: true; username: string; password: string }>({ show: false });
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [dashboardData, studentData, userData, classroomData, examData, deletedData] = await Promise.all([
          apiRequest<DashboardData>({ path: "/admin/dashboard", auth: props.auth }),
          apiRequest<Student[]>({ path: "/admin/students", auth: props.auth }),
          apiRequest<User[]>({ path: "/admin/users", auth: props.auth }),
          apiRequest<Classroom[]>({ path: "/admin/classrooms", auth: props.auth }),
          apiRequest<Exam[]>({ path: "/admin/exams", auth: props.auth }),
          apiRequest<DeletedItem[]>({ path: "/admin/recycle-bin", auth: props.auth })
        ]);

        if (isMounted) {
          setDashboard(dashboardData);
          setStudents(studentData);
          setUsers(userData);
          setClassrooms(classroomData);
          setExams(examData);
          setDeletedItems(deletedData);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Failed loading dashboard");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [props.auth]);

  useEffect(() => {
    if (!props.auth) {
      return;
    }

    const socket = connectSocket(props.auth);
    socketRef.current = socket;

    socket.on("admin:students_snapshot", (snapshot: Student[]) => {
      setStudents(snapshot);
    });

    socket.on("admin:student_update", (updated: Student) => {
      setStudents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    });

    socket.on("admin:monitor_event", (event: { type: string; studentId: string; severity?: string }) => {
      setLastEvent(`${event.studentId} · ${event.type}${event.severity ? ` · ${event.severity}` : ""}`);
    });

    socket.on("admin:warning_ack", (payload: { studentId: string; warningId: string }) => {
      setLastEvent(`${payload.studentId} acknowledged warning ${payload.warningId}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.auth]);

  function sendWarning(studentId: string) {
    if (!props.auth || !socketRef.current) {
      return;
    }

    const message = warnings[studentId]?.trim() || "Stand up and rotate 360° for camera verification.";
    socketRef.current.emit("admin:warning", {
      studentId,
      examId: "exam-1",
      message
    });
  }

  async function createUser() {
    if (!props.auth || !newUserFirstName.trim() || !newUserLastName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const response = await apiRequest<{ created: boolean; user: NewUserCredentials }>({
        path: "/admin/users",
        method: "POST",
        auth: props.auth,
        body: {
          firstName: newUserFirstName.trim(),
          lastName: newUserLastName.trim(),
          role: newUserRole,
          classroomId: newUserRole === "student" && newUserClassroom ? newUserClassroom : undefined
        }
      });

      if (response.created && response.user) {
        setCreatedCredentials(response.user);
        setShowCredentials(true);
        
        // Refresh users list
        const userData = await apiRequest<User[]>({ path: "/admin/users", auth: props.auth });
        setUsers(userData);
        
        // Reset form and hide it
        setNewUserFirstName("");
        setNewUserLastName("");
        setNewUserRole("student");
        setNewUserClassroom("");
        setShowCreateForm(false);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  function confirmDeleteUser(userId: string) {
    if (!props.auth) return;
    
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this user?",
      onConfirm: () => deleteUser(userId)
    });
  }

  async function deleteUser(userId: string) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/users/${userId}`,
        method: "DELETE",
        auth: props.auth
      });

      // Refresh users list
      const userData = await apiRequest<User[]>({ path: "/admin/users", auth: props.auth });
      setUsers(userData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  function confirmResetPassword(userId: string) {
    if (!props.auth) return;
    
    setConfirmModal({
      show: true,
      message: "Generate a new password for this user?",
      onConfirm: () => resetPassword(userId)
    });
  }

  async function resetPassword(userId: string) {
    if (!props.auth) return;

    try {
      const response = await apiRequest<{ updated: boolean; userId: string; newPassword: string }>({
        path: `/admin/users/${userId}/password`,
        method: "PATCH",
        auth: props.auth,
        body: {}
      });

      if (response.updated) {
        setPasswordResetModal({
          show: true,
          username: userId,
          password: response.newPassword
        });
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setAlertModal({ show: true, message: `${label} copied to clipboard!` });
    }).catch(() => {
      setAlertModal({ show: true, message: `Failed to copy ${label}` });
    });
  }

  function copyAllCredentials() {
    if (!createdCredentials) return;
    
    const text = `Name: ${createdCredentials.name}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}`;
    navigator.clipboard.writeText(text).then(() => {
      setAlertModal({ show: true, message: "All credentials copied to clipboard!" });
    }).catch(() => {
      setAlertModal({ show: true, message: "Failed to copy credentials" });
    });
  }

  // Classroom Management Functions
  async function createOrUpdateClassroom() {
    if (!props.auth || !classroomName.trim()) {
      setError("Please enter a classroom name");
      return;
    }

    try {
      if (editingClassroom) {
        // Update existing classroom
        await apiRequest({
          path: `/admin/classrooms/${editingClassroom.id}`,
          method: "PATCH",
          auth: props.auth,
          body: { name: classroomName.trim() }
        });
        setAlertModal({ show: true, message: "Classroom updated successfully!" });
      } else {
        // Create new classroom
        await apiRequest({
          path: "/admin/classrooms",
          method: "POST",
          auth: props.auth,
          body: { name: classroomName.trim() }
        });
        setAlertModal({ show: true, message: "Classroom created successfully!" });
      }

      // Refresh classrooms list
      const classroomData = await apiRequest<Classroom[]>({ path: "/admin/classrooms", auth: props.auth });
      setClassrooms(classroomData);
      
      // Reset form
      setClassroomName("");
      setEditingClassroom(null);
      setShowClassroomForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save classroom");
    }
  }

  function startEditClassroom(classroom: Classroom) {
    setEditingClassroom(classroom);
    setClassroomName(classroom.name);
    setShowClassroomForm(true);
  }

  function cancelClassroomForm() {
    setClassroomName("");
    setEditingClassroom(null);
    setShowClassroomForm(false);
  }

  function confirmDeleteClassroom(classroomId: string) {
    if (!props.auth) return;
    
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this classroom?",
      onConfirm: () => deleteClassroom(classroomId)
    });
  }

  async function deleteClassroom(classroomId: string) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/classrooms/${classroomId}`,
        method: "DELETE",
        auth: props.auth
      });

      // Refresh classrooms list
      const classroomData = await apiRequest<Classroom[]>({ path: "/admin/classrooms", auth: props.auth });
      setClassrooms(classroomData);
      setAlertModal({ show: true, message: "Classroom deleted successfully!" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete classroom");
    }
  }

  // Recycle bin functions
  async function restoreItem(itemId: string) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/recycle-bin/${itemId}/restore`,
        method: "POST",
        auth: props.auth
      });

      // Refresh deleted items
      const deletedData = await apiRequest<DeletedItem[]>({ path: "/admin/recycle-bin", auth: props.auth });
      setDeletedItems(deletedData);
      
      setAlertModal({ show: true, message: "Item restored successfully!" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore item");
    }
  }

  function confirmPermanentDelete(itemId: string) {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to permanently delete this item? This action cannot be undone.",
      onConfirm: () => permanentlyDeleteItem(itemId)
    });
  }

  async function permanentlyDeleteItem(itemId: string) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/recycle-bin/${itemId}`,
        method: "DELETE",
        auth: props.auth
      });

      // Refresh deleted items
      const deletedData = await apiRequest<DeletedItem[]>({ path: "/admin/recycle-bin", auth: props.auth });
      setDeletedItems(deletedData);
      
      setAlertModal({ show: true, message: "Item permanently deleted!" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to permanently delete item");
    }
  }

  // Exam management functions
  async function saveExam(exam: any) {
    if (!props.auth) return;

    try {
      if (exam.id) {
        // Update existing exam
        await apiRequest({
          path: `/admin/exams/${exam.id}`,
          method: "PATCH",
          auth: props.auth,
          body: exam
        });
        setAlertModal({ show: true, message: "Exam updated successfully!" });
      } else {
        // Create new exam
        await apiRequest({
          path: "/admin/exams",
          method: "POST",
          auth: props.auth,
          body: exam
        });
        setAlertModal({ show: true, message: "Exam created successfully!" });
      }

      // Refresh exams list
      const examData = await apiRequest<Exam[]>({ path: "/admin/exams", auth: props.auth });
      setExams(examData);
      
      navigate('/admin/exams');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exam");
    }
  }

  async function toggleExamActive(examId: string, isActive: boolean) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/exams/${examId}/activate`,
        method: "PATCH",
        auth: props.auth,
        body: { isActive }
      });

      // Refresh exams list
      const examData = await apiRequest<Exam[]>({ path: "/admin/exams", auth: props.auth });
      setExams(examData);
      
      setAlertModal({ show: true, message: `Exam ${isActive ? 'activated' : 'deactivated'} successfully!` });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle exam status");
    }
  }

  function confirmDeleteExam(examId: string) {
    setConfirmModal({
      show: true,
      message: "Delete this exam? It will be moved to the recycle bin.",
      onConfirm: () => deleteExam(examId)
    });
  }

  async function deleteExam(examId: string) {
    if (!props.auth) return;

    try {
      await apiRequest({
        path: `/admin/exams/${examId}`,
        method: "DELETE",
        auth: props.auth
      });

      // Refresh exams list
      const examData = await apiRequest<Exam[]>({ path: "/admin/exams", auth: props.auth });
      setExams(examData);
      
      setAlertModal({ show: true, message: "Exam moved to recycle bin!" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exam");
    }
  }


  return (
    <div className="admin-dashboard">
      {/* Sidebar - Hide when editing exam */}
      {!(activeView === "exams" && (isCreatingExam || isEditingExam)) && (
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-math">
                <path d="M3 3h18M3 9h18M3 15h18M3 21h18M9 3v18M15 3v18" />
              </svg>
            </div>
            <div>
              <h1 className="sidebar-title">Math Admin</h1>
              <p className="sidebar-subtitle">Control Panel</p>
            </div>
          </div>
        
        <nav className="sidebar-nav">
          <a className={`nav-item ${activeView === "overview" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin"); }} href="#">Overview</a>
          <a className={`nav-item ${activeView === "users" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin/users"); }} href="#">User Management</a>
          <a className={`nav-item ${activeView === "classrooms" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin/classrooms"); }} href="#">Classrooms</a>
          <a className={`nav-item ${activeView === "students" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin/students"); }} href="#">Students</a>
          <a className={`nav-item ${activeView === "exams" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin/exams"); }} href="#">Exams</a>
          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>Live Monitoring</a>
          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>Activity Logs</a>
          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>Results</a>
          <a className={`nav-item ${activeView === "recycleBin" ? "nav-item-active" : ""}`} onClick={(e) => { e.preventDefault(); navigate("/admin/recycle-bin"); }} href="#">Recycle Bin</a>
          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>Settings</a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">A</div>
            <div className="user-details">
              <p className="user-name">Admin</p>
              <p className="user-email">admin@math.edu</p>
            </div>
          </div>
          <button onClick={props.onLogout} className="logout-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-logout">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className={`admin-main ${(activeView === "exams" && (isCreatingExam || isEditingExam)) ? 'fullscreen' : ''}`}>
        <div className="content-container">
          {error ? (
            <div className="alert-error" style={{ marginBottom: "24px", padding: "16px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px" }}>{error}</div>
          ) : null}

          {/* Overview View */}
          {activeView === "overview" && (
            <>
              {/* Header */}
              <div className="page-header">
                <div>
                  <h1 className="page-title">Dashboard Overview</h1>
                  <p className="page-subtitle">Welcome back, here's what's happening today.</p>
                </div>
              </div>

              {/* Stats Grid */}
              {dashboard ? (
                <div className="stats-grid">
                  <div className="stat-card stat-blue">
                    <div className="stat-icon stat-icon-blue">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="stat-label">Total Students</p>
                      <p className="stat-value">{dashboard.students}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-green">
                    <div className="stat-icon stat-icon-green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="stat-label">Classrooms</p>
                      <p className="stat-value">{dashboard.classrooms}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-purple">
                    <div className="stat-icon stat-icon-purple">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20M20 17V22M20 17l-7-7M20 17H10a2 2 0 01-2-2V5" />
                      </svg>
                    </div>
                    <div>
                      <p className="stat-label">Active Exams</p>
                      <p className="stat-value">{dashboard.exams}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-orange">
                    <div className="stat-icon stat-icon-orange">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="stat-label">Flagged</p>
                      <p className="stat-value">{dashboard.flagged}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="loading-text">Loading dashboard...</p>
              )}

              {/* Live Monitoring */}
              <div className="monitoring-section">
                <h2 className="section-title">Live Student Monitoring</h2>
                
                <div className="realtime-badge">
                  <span className="pulse-dot"></span>
                  <span className="realtime-text">Realtime Updates: {lastEvent}</span>
                </div>

                {/* Students Table */}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Camera</th>
                        <th>Phone</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="student-name">{student.name}</td>
                          <td className="student-id">{student.id}</td>
                          <td>
                            <span className="badge badge-status">{student.status}</span>
                          </td>
                          <td>
                            <span className={student.cameraVerified ? "badge badge-verified" : "badge badge-unverified"}>
                              {student.cameraVerified ? "Active" : "Not verified"}
                            </span>
                          </td>
                          <td>
                            <span className={student.phoneLinked ? "badge badge-verified" : "badge badge-unverified"}>
                              {student.phoneLinked ? "Linked" : "Not linked"}
                            </span>
                          </td>
                          <td>
                            <div className="action-cell">
                              <input
                                type="text"
                                className="warning-input"
                                placeholder="Warning message"
                                value={warnings[student.id] ?? ""}
                                onChange={(event) => {
                                  setWarnings((current) => ({ ...current, [student.id]: event.target.value }));
                                }}
                              />
                              <button onClick={() => sendWarning(student.id)} className="action-button">
                                Send Warning
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* User Management View */}
          {activeView === "users" && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">User Management</h1>
                  <p className="page-subtitle">Create and manage student and admin accounts</p>
                </div>
                <button 
                  onClick={() => setShowCreateForm(!showCreateForm)} 
                  className="create-new-user-btn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "20px", height: "20px" }}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {showCreateForm ? "Cancel" : "Create New User"}
                </button>
              </div>

              {/* Create User Form - Conditionally Rendered */}
              {showCreateForm && (
                <div className="user-form-section">
                  <h2 className="section-title">Create New User</h2>
                  <div className="user-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          value={newUserFirstName}
                          onChange={(e) => setNewUserFirstName(e.target.value)}
                          placeholder="Enter first name"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          value={newUserLastName}
                          onChange={(e) => setNewUserLastName(e.target.value)}
                          placeholder="Enter last name"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as "student" | "admin")}
                          className="form-select"
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {newUserRole === "student" && (
                        <div className="form-group">
                          <label>Classroom</label>
                          <select
                            value={newUserClassroom}
                            onChange={(e) => setNewUserClassroom(e.target.value)}
                            className="form-select"
                          >
                            <option value="">No classroom</option>
                            {classrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id}>
                                {classroom.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <button onClick={createUser} className="create-user-button">
                      Create User
                    </button>
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="monitoring-section">
                <h2 className="section-title">All Users ({users.length})</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Classroom</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="student-name">{user.name}</td>
                          <td className="student-id">{user.id}</td>
                          <td>
                            <span className={`badge ${user.role === "admin" ? "badge-verified" : "badge-status"}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="student-id">{user.classroomId || "-"}</td>
                          <td>
                            <div className="action-cell" style={{ gap: "8px" }}>
                              <button onClick={() => confirmResetPassword(user.id)} className="action-button" style={{ background: "#3b82f6" }}>
                                Reset Password
                              </button>
                              <button onClick={() => confirmDeleteUser(user.id)} className="action-button" style={{ background: "#dc2626" }}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Classrooms View */}
          {activeView === "classrooms" && (
            <>
              {selectedClassroom ? (
                <ClassroomDetail
                  classroomId={selectedClassroom}
                  auth={props.auth}
                  onBack={() => setSelectedClassroom(null)}
                  onRefresh={() => {
                    void Promise.all([
                      apiRequest<Classroom[]>({ path: "/admin/classrooms", auth: props.auth }).then(setClassrooms)
                    ]);
                  }}
                />
              ) : (
                <>
                  <div className="page-header">
                    <div>
                      <h1 className="page-title">Classroom Management</h1>
                      <p className="page-subtitle">Create and manage classrooms</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (showClassroomForm && !editingClassroom) {
                          cancelClassroomForm();
                        } else {
                          setShowClassroomForm(true);
                          setEditingClassroom(null);
                          setClassroomName("");
                        }
                      }} 
                      className="create-new-user-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "20px", height: "20px" }}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {showClassroomForm && !editingClassroom ? "Cancel" : "Create New Classroom"}
                    </button>
                  </div>

                  {/* Create/Edit Classroom Form */}
                  {showClassroomForm && (
                    <div className="user-form-section">
                      <h2 className="section-title">{editingClassroom ? "Edit Classroom" : "Create New Classroom"}</h2>
                      <div className="user-form">
                        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                          <label>Classroom Name</label>
                          <input
                            type="text"
                            value={classroomName}
                            onChange={(e) => setClassroomName(e.target.value)}
                            placeholder="Enter classroom name (e.g., Grade 10A, Math 101)"
                            className="form-input"
                          />
                        </div>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <button onClick={createOrUpdateClassroom} className="create-user-button">
                            {editingClassroom ? "Update Classroom" : "Create Classroom"}
                          </button>
                          {editingClassroom && (
                            <button onClick={cancelClassroomForm} className="cancel-button-modal" style={{ padding: "12px 24px" }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Classrooms List */}
                  <div className="monitoring-section">
                    <h2 className="section-title">All Classrooms ({classrooms.length})</h2>
                    {classrooms.length === 0 ? (
                      <div className="empty-state-box">
                        <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="empty-message">No classrooms yet. Create your first classroom above!</p>
                      </div>
                    ) : (
                      <div className="classroom-grid">
                        {classrooms.map((classroom) => {
                          const studentCount = users.filter(u => u.classroomId === classroom.id).length;
                          return (
                            <div 
                              key={classroom.id} 
                              className="classroom-card"
                              onClick={() => setSelectedClassroom(classroom.id)}
                            >
                              <div className="classroom-card-header">
                                <div className="classroom-card-icon">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <h3 className="classroom-card-title">{classroom.name}</h3>
                              </div>
                              <div className="classroom-card-stats">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="classroom-card-count">{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
                              </div>
                              <div className="classroom-card-actions">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditClassroom(classroom);
                                  }} 
                                  className="classroom-action-btn classroom-edit-btn"
                                  title="Edit classroom"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Edit
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteClassroom(classroom.id);
                                  }} 
                                  className="classroom-action-btn classroom-delete-btn"
                                  title="Delete classroom"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Exams View */}
          {activeView === "exams" && (
            <>
              {(isCreatingExam || isEditingExam) ? (
                <ExamEditor
                  examId={editingExamId || undefined}
                  auth={props.auth}
                  onBack={() => navigate('/admin/exams')}
                  onSave={saveExam}
                />
              ) : (
                <>
                  <div className="page-header">
                    <div>
                      <h1 className="page-title">Exam Management</h1>
                      <p className="page-subtitle">Create and manage mathematics exams</p>
                    </div>
                    <button className="primary-button" onClick={() => navigate('/admin/exams/create')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Create Exam
                    </button>
                  </div>

                  <div className="content-area">
                    {exams.length === 0 ? (
                      <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        <h3>No exams created</h3>
                        <p>Create your first exam to get started</p>
                      </div>
                    ) : (
                      <div className="exams-grid">
                        {exams.map((exam) => (
                          <div 
                            key={exam.id} 
                            className="exam-card"
                            onClick={() => navigate(`/admin/exams/edit/${exam.id}`)}
                          >
                            <div className="exam-card-header">
                              <div>
                                <h3 className="exam-card-title">{exam.title}</h3>
                                <p className="exam-card-code">Code: {exam.code}</p>
                              </div>
                              <div className={`exam-status ${exam.isActive ? 'status-active' : 'status-inactive'}`}>
                                {exam.isActive ? '● Active' : '○ Inactive'}
                              </div>
                            </div>
                            
                            <div className="exam-card-details">
                              <div className="exam-detail-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>{exam.timeLimitMinutes} minutes</span>
                              </div>
                              {exam.questions && exam.questions.length > 0 && (
                                <div className="exam-detail-item">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  <span>{exam.questions.length} question{exam.questions.length === 1 ? '' : 's'}</span>
                                </div>
                              )}
                              {exam.classroomIds && exam.classroomIds.length > 0 && (
                                <div className="exam-detail-item">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                  </svg>
                                  <span>{exam.classroomIds.length} classroom(s)</span>
                                </div>
                              )}
                            </div>

                            <div className="exam-card-actions" onClick={(e) => e.stopPropagation()}>
                              <button className="exam-action-btn exam-edit-btn" onClick={() => navigate(`/admin/exams/edit/${exam.id}`)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                              <button className="exam-action-btn exam-toggle-btn" onClick={(e) => { e.stopPropagation(); toggleExamActive(exam.id, !exam.isActive); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="10 8 16 12 10 16 10 8"/>
                                </svg>
                                {exam.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="exam-action-btn exam-delete-btn" onClick={(e) => { e.stopPropagation(); confirmDeleteExam(exam.id); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Students View */}
          {activeView === "students" && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Student Management</h1>
                  <p className="page-subtitle">View and manage all students</p>
                </div>
              </div>

              <div className="content-area">
                {students.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    <h3>No students found</h3>
                    <p>Students will appear here once they are created</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Classroom</th>
                          <th>Status</th>
                          <th>Camera Verified</th>
                          <th>Phone Linked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const classroom = classrooms.find(c => c.id === student.id.split('-')[0]);
                          return (
                            <tr key={student.id}>
                              <td className="name-cell">{student.name}</td>
                              <td>{classroom?.name || 'N/A'}</td>
                              <td>
                                <span className={`status-badge status-${student.status.toLowerCase()}`}>
                                  {student.status}
                                </span>
                              </td>
                              <td>
                                {student.cameraVerified ? (
                                  <span className="badge-success">✓ Verified</span>
                                ) : (
                                  <span className="badge-warning">Not Verified</span>
                                )}
                              </td>
                              <td>
                                {student.phoneLinked ? (
                                  <span className="badge-success">✓ Linked</span>
                                ) : (
                                  <span className="badge-warning">Not Linked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recycle Bin View */}
          {activeView === "recycleBin" && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Recycle Bin</h1>
                  <p className="page-subtitle">Restore or permanently delete items</p>
                </div>
              </div>

              <div className="content-area">
                {deletedItems.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                    <h3>Recycle bin is empty</h3>
                    <p>Deleted exams and questions will appear here</p>
                  </div>
                ) : (
                  <div className="recycle-bin-list">
                    {deletedItems.map((item) => {
                      const isExam = item.type === "exam";
                      const itemData = item.data;
                      const name = isExam ? itemData.title : itemData.text || itemData.question;
                      
                      return (
                        <div key={item.id} className="recycle-bin-item">
                          <div className="recycle-bin-item-icon">
                            {isExam ? (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                              </svg>
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                            )}
                          </div>
                          
                          <div className="recycle-bin-item-details">
                            <h4 className="recycle-bin-item-title">
                              {name}
                              <span className="recycle-bin-item-type">{isExam ? "Exam" : "Question"}</span>
                            </h4>
                            <p className="recycle-bin-item-metadata">
                              Deleted {new Date(item.deletedAt).toLocaleString()} by {item.deletedBy}
                            </p>
                          </div>
                          
                          <div className="recycle-bin-item-actions">
                            <button
                              onClick={() => restoreItem(item.id)}
                              className="restore-button"
                              title="Restore item"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                              </svg>
                              Restore
                            </button>
                            <button
                              onClick={() => confirmPermanentDelete(item.id)}
                              className="permanent-delete-button"
                              title="Permanently delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                              Delete Forever
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Credentials Modal */}
          {showCredentials && createdCredentials && (
            <div className="modal-overlay" onClick={() => setShowCredentials(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">User Created Successfully!</h2>
                <p className="modal-subtitle">Save these credentials and share them with the user</p>
                
                <div className="credentials-box">
                  <div className="credential-item">
                    <span className="credential-label">Name:</span>
                    <span className="credential-value">{createdCredentials.name}</span>
                    <button onClick={() => copyToClipboard(createdCredentials.name, "Name")} className="copy-button">Copy</button>
                  </div>
                  <div className="credential-item">
                    <span className="credential-label">Username:</span>
                    <span className="credential-value">{createdCredentials.username}</span>
                    <button onClick={() => copyToClipboard(createdCredentials.username, "Username")} className="copy-button">Copy</button>
                  </div>
                  <div className="credential-item">
                    <span className="credential-label">Password:</span>
                    <span className="credential-value">{createdCredentials.password}</span>
                    <button onClick={() => copyToClipboard(createdCredentials.password, "Password")} className="copy-button">Copy</button>
                  </div>
                  <div className="credential-item">
                    <span className="credential-label">Role:</span>
                    <span className="credential-value">{createdCredentials.role}</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={copyAllCredentials} className="copy-all-button">
                    Copy All Credentials
                  </button>
                  <button onClick={() => setShowCredentials(false)} className="close-button">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alert Modal */}
          {alertModal.show && (
            <div className="modal-overlay" onClick={() => setAlertModal({ show: false, message: "" })}>
              <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
                <div className="alert-modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="modal-title-center">{alertModal.message}</h2>
                <div className="modal-actions-center">
                  <button onClick={() => setAlertModal({ show: false, message: "" })} className="confirm-button">
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Modal */}
          {confirmModal.show && (
            <div className="modal-overlay" onClick={() => setConfirmModal({ show: false })}>
              <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="modal-title-center">{confirmModal.message}</h2>
                <div className="modal-actions-center">
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal({ show: false });
                    }} 
                    className="confirm-button"
                  >
                    Confirm
                  </button>
                  <button onClick={() => setConfirmModal({ show: false })} className="cancel-button-modal">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Reset Success Modal */}
          {passwordResetModal.show && (
            <div className="modal-overlay" onClick={() => setPasswordResetModal({ show: false })}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="success-icon-large">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="modal-title">Password Reset Successful!</h2>
                <p className="modal-subtitle">Make sure to save this password and share it with the user</p>
                
                <div className="credentials-box">
                  <div className="credential-item">
                    <span className="credential-label">Username:</span>
                    <span className="credential-value">{passwordResetModal.username}</span>
                    <button onClick={() => copyToClipboard(passwordResetModal.username, "Username")} className="copy-button">Copy</button>
                  </div>
                  <div className="credential-item">
                    <span className="credential-label">New Password:</span>
                    <span className="credential-value">{passwordResetModal.password}</span>
                    <button onClick={() => copyToClipboard(passwordResetModal.password, "Password")} className="copy-button">Copy</button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      const text = `Username: ${passwordResetModal.username}\\nNew Password: ${passwordResetModal.password}`;
                      navigator.clipboard.writeText(text).then(() => {
                        setAlertModal({ show: true, message: "Credentials copied to clipboard!" });
                        setPasswordResetModal({ show: false });
                      });
                    }} 
                    className="copy-all-button"
                  >
                    Copy Both
                  </button>
                  <button onClick={() => setPasswordResetModal({ show: false })} className="close-button">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
