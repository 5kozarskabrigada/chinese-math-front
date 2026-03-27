import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthState } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

type StudentProfile = {
  id: string;
  name: string;
  cameraVerified: boolean;
  phoneLinked: boolean;
  status: string;
};

type JoinedExam = {
  id: string;
  title: string;
  timeLimitMinutes: number;
};

export function StudentPage(props: { auth: AuthState | null; onLogout: () => void }): JSX.Element {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [examCode, setExamCode] = useState("123456");
  const [joinedExam, setJoinedExam] = useState<JoinedExam | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeWarningId, setActiveWarningId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMe() {
      try {
        const result = await apiRequest<StudentProfile>({ path: "/student/me", auth: props.auth });
        if (isMounted) {
          setProfile(result);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Failed loading profile");
        }
      }
    }

    void loadMe();
    return () => {
      isMounted = false;
    };
  }, [props.auth]);

  useEffect(() => {
    if (!joinedExam || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          void apiRequest({
            path: "/student/submit-exam",
            method: "POST",
            body: { examId: joinedExam.id },
            auth: props.auth
          });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [joinedExam, isPaused, props.auth]);

  useEffect(() => {
    if (!props.auth) {
      return;
    }

    const socket = connectSocket(props.auth);
    socketRef.current = socket;
    socket.on("student:warning", (payload: { id: string; message: string }) => {
      setActiveWarningId(payload.id);
      setWarning(payload.message);
      setIsPaused(true);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.auth]);

  useEffect(() => {
    if (!joinedExam) {
      return;
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        socketRef.current?.emit("student:monitor_event", {
          examId: joinedExam.id,
          type: "tab_switch",
          severity: "severe",
          metadata: { visibilityState: document.visibilityState }
        });
      }
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setWarning("Do not leave fullscreen. Violation recorded.");
        socketRef.current?.emit("student:monitor_event", {
          examId: joinedExam.id,
          type: "fullscreen_exit",
          severity: "critical"
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [joinedExam, props.auth]);

  const timerText = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }, [remainingSeconds]);

  async function verifyCamera() {
    await apiRequest({ path: "/student/verify-camera", method: "POST", auth: props.auth });
    const updated = await apiRequest<StudentProfile>({ path: "/student/me", auth: props.auth });
    setProfile(updated);
  }

  async function linkPhone() {
    await apiRequest({ path: "/student/link-phone", method: "POST", auth: props.auth });
    const updated = await apiRequest<StudentProfile>({ path: "/student/me", auth: props.auth });
    setProfile(updated);
  }

  async function startExam() {
    if (!profile) {
      return;
    }

    setError(null);

    try {
      const result = await apiRequest<{ joined: boolean; exam: JoinedExam }>({
        path: "/student/join-exam",
        method: "POST",
        auth: props.auth,
        body: { code: examCode }
      });

      await document.documentElement.requestFullscreen();
      setJoinedExam(result.exam);
      setRemainingSeconds(result.exam.timeLimitMinutes * 60);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to start exam");
    }
  }

  if (!profile) {
    return <main className="loading">Loading student profile...</main>;
  }

  const warningVisible = warning && isPaused;

  return (
    <main className="student-layout">
      <header className="exam-header">
        <div>{profile.id} • Mathematics Test</div>
        <h1>Mathematics National Exam</h1>
        <div className={remainingSeconds <= 300 ? "timer danger" : remainingSeconds <= 900 ? "timer warn" : "timer"}>
          {timerText}
        </div>
      </header>

      <div className="warning-strip">Do not leave the exam window. All actions are monitored.</div>

      {!joinedExam ? (
        <section className="pre-exam-section">
          <div className="panel">
            <h2>Pre-Exam Setup</h2>
            <p>Before starting your exam, we need to verify your identity and setup monitoring systems for exam integrity.</p>
            
            <div className="stack">
              <div>
                <h3 style={{ color: 'var(--primary-blue)', fontSize: '14px', marginBottom: '10px', fontWeight: '600' }}>
                  Verification Steps
                </h3>
                <div className="row">
                  <button 
                    className={profile.cameraVerified ? "success-button" : ""}
                    onClick={verifyCamera} 
                    disabled={profile.cameraVerified}
                  >
                    {profile.cameraVerified ? "Camera Verified" : "Verify Camera"}
                  </button>
                  <button 
                    className={profile.phoneLinked ? "success-button" : ""}
                    onClick={linkPhone} 
                    disabled={profile.phoneLinked}
                  >
                    {profile.phoneLinked ? "Phone Linked" : "Link Phone"}
                  </button>
                </div>
              </div>
              
              <div className="input-group">
                <label>Exam Access Code</label>
                <input 
                  value={examCode} 
                  onChange={(event) => setExamCode(event.target.value)} 
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '16px', letterSpacing: '3px' }}
                />
              </div>
              
              {error ? <div className="error">{error}</div> : null}
              
              <button 
                onClick={startExam} 
                disabled={!profile.cameraVerified || !profile.phoneLinked}
                style={{ 
                  padding: '12px 20px', 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  background: (!profile.cameraVerified || !profile.phoneLinked) ? 'var(--text-muted)' : 'var(--primary-blue)'
                }}
              >
                {(!profile.cameraVerified || !profile.phoneLinked) ? 
                  "Complete Setup First" : 
                  "Start Exam"
                }
              </button>
              
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button className="text-button" onClick={props.onLogout}>
                  ← Back to Login
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="exam-shell">
          {warningVisible ? (
            <div className="warning-modal stack">
              <div>{warning}</div>
              <button
                onClick={() => {
                  if (activeWarningId) {
                    socketRef.current?.emit("student:warning_ack", { warningId: activeWarningId });
                  }
                  setIsPaused(false);
                  setWarning(null);
                  setActiveWarningId(null);
                }}
              >
                Done
              </button>
            </div>
          ) : null}
          <article className="question-card">
            <h3>1. Solve for x:</h3>
            <p className="math">$2x^2 - 5x - 3 = 0$</p>
            <ul>
              <li><input type="radio" name="q1" /> (A) x = 3, -1/2</li>
              <li><input type="radio" name="q1" /> (B) x = 1, -3</li>
              <li><input type="radio" name="q1" /> (C) x = 2, -1</li>
              <li><input type="radio" name="q1" /> (D) x = 5, -3/2</li>
            </ul>
          </article>

          <footer className="control-bar">
            <button>← Previous</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <input type="checkbox" /> Mark for Review
            </label>
            <button>Next →</button>
            <button
              className="danger-button"
              onClick={async () => {
                if (window.confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
                  await apiRequest({
                    path: "/student/submit-exam",
                    method: "POST",
                    auth: props.auth,
                    body: { examId: joinedExam.id }
                  });
                  setJoinedExam(null);
                }
              }}
            >
              Submit Exam
            </button>
          </footer>
        </section>
      )}
    </main>
  );
}
