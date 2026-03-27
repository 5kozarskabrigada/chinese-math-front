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
    <main className="admin-layout">
      <aside className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <a>Students</a>
          <a>Classrooms</a>
          <a>Exams</a>
          <a>Live Monitoring</a>
          <a>Activity Logs</a>
          <a>Results</a>
          <a>Archive</a>
        </nav>
        <button onClick={props.onLogout}>Logout</button>
      </aside>

      <section className="content">
        <h1>Chinese Math Exam Dashboard</h1>
        {error ? <div className="error">{error}</div> : null}
        {dashboard ? (
          <div className="metric-grid">
            <article><strong>{dashboard.students}</strong><span>Students</span></article>
            <article><strong>{dashboard.classrooms}</strong><span>Classrooms</span></article>
            <article><strong>{dashboard.exams}</strong><span>Active Exams</span></article>
            <article><strong>{dashboard.flagged}</strong><span>Flagged</span></article>
            <article><strong>{dashboard.terminated}</strong><span>Terminated</span></article>
          </div>
        ) : (
          <p className="muted">Loading dashboard...</p>
        )}

        <div className="student-grid">
          <h3>Live Student Monitoring</h3>
          <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '16px', padding: '16px', background: 'var(--light-blue)', borderRadius: '8px', margin: '0 0 20px 0' }}>
            Realtime Updates: {lastEvent}
          </p>
          {students.map((student) => (
            <article key={student.id} className="student-card">
              <header>
                <strong>{student.name}</strong>
                <span>{student.id}</span>
              </header>
              <p>Status: {student.status}</p>
              <p>Camera: {student.cameraVerified ? "Active" : "Not verified"}</p>
              <p>Phone: {student.phoneLinked ? "Linked" : "Not linked"}</p>
              <label>
                Warning message
                <input
                  value={warnings[student.id] ?? ""}
                  onChange={(event) => {
                    setWarnings((current) => ({ ...current, [student.id]: event.target.value }));
                  }}
                />
              </label>
              <button onClick={() => sendWarning(student.id)}>Send Warning</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
