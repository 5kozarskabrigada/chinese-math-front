import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";
import { connectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

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

export function AdminPage(props: { auth: AuthState | null; onLogout: () => void }): JSX.Element {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [lastEvent, setLastEvent] = useState<string>("No realtime events yet.");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [dashboardData, studentData] = await Promise.all([
          apiRequest<DashboardData>({ path: "/admin/dashboard", auth: props.auth }),
          apiRequest<Student[]>({ path: "/admin/students", auth: props.auth })
        ]);

        if (isMounted) {
          setDashboard(dashboardData);
          setStudents(studentData);
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

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
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
          <a className="nav-item nav-item-active">Overview</a>
          <a className="nav-item">Students</a>
          <a className="nav-item">Classrooms</a>
          <a className="nav-item">Exams</a>
          <a className="nav-item">Live Monitoring</a>
          <a className="nav-item">Activity Logs</a>
          <a className="nav-item">Results</a>
          <a className="nav-item">Settings</a>
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

      {/* Main Content */}
      <main className="admin-main">
        <div className="content-container">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard Overview</h1>
              <p className="page-subtitle">Welcome back, here's what's happening today.</p>
            </div>
          </div>

          {error ? (
            <div className="alert-error">{error}</div>
          ) : null}

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
        </div>
      </main>
    </div>
  );
}
