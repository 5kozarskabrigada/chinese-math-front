import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { connectSocket } from "../lib/socket";
export function AdminPage(props) {
    const [dashboard, setDashboard] = useState(null);
    const [students, setStudents] = useState([]);
    const [warnings, setWarnings] = useState({});
    const [lastEvent, setLastEvent] = useState("No realtime events yet.");
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    useEffect(() => {
        let isMounted = true;
        async function loadData() {
            try {
                const [dashboardData, studentData] = await Promise.all([
                    apiRequest({ path: "/admin/dashboard", auth: props.auth }),
                    apiRequest({ path: "/admin/students", auth: props.auth })
                ]);
                if (isMounted) {
                    setDashboard(dashboardData);
                    setStudents(studentData);
                }
            }
            catch (requestError) {
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
        socket.on("admin:students_snapshot", (snapshot) => {
            setStudents(snapshot);
        });
        socket.on("admin:student_update", (updated) => {
            setStudents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        });
        socket.on("admin:monitor_event", (event) => {
            setLastEvent(`${event.studentId} · ${event.type}${event.severity ? ` · ${event.severity}` : ""}`);
        });
        socket.on("admin:warning_ack", (payload) => {
            setLastEvent(`${payload.studentId} acknowledged warning ${payload.warningId}`);
        });
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [props.auth]);
    function sendWarning(studentId) {
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
    return (_jsxs("main", { className: "admin-layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("h2", { children: "Admin Panel" }), _jsxs("nav", { children: [_jsx("a", { children: "Students" }), _jsx("a", { children: "Classrooms" }), _jsx("a", { children: "Exams" }), _jsx("a", { children: "Monitoring" }), _jsx("a", { children: "Logs" }), _jsx("a", { children: "Submissions / Results" }), _jsx("a", { children: "Recycle Bin" })] }), _jsx("button", { onClick: props.onLogout, children: "Logout" })] }), _jsxs("section", { className: "content", children: [_jsx("h1", { children: "Proctor Dashboard" }), error ? _jsx("div", { className: "error", children: error }) : null, dashboard ? (_jsxs("div", { className: "metric-grid", children: [_jsxs("article", { children: [_jsx("strong", { children: dashboard.students }), _jsx("span", { children: "Students" })] }), _jsxs("article", { children: [_jsx("strong", { children: dashboard.classrooms }), _jsx("span", { children: "Classrooms" })] }), _jsxs("article", { children: [_jsx("strong", { children: dashboard.exams }), _jsx("span", { children: "Exams" })] }), _jsxs("article", { children: [_jsx("strong", { children: dashboard.flagged }), _jsx("span", { children: "Flagged" })] }), _jsxs("article", { children: [_jsx("strong", { children: dashboard.terminated }), _jsx("span", { children: "Terminated" })] })] })) : (_jsx("p", { className: "muted", children: "Loading dashboard..." })), _jsx("h3", { children: "Live Student States" }), _jsxs("p", { className: "muted", children: ["Realtime: ", lastEvent] }), _jsx("div", { className: "student-grid", children: students.map((student) => (_jsxs("article", { className: "student-card", children: [_jsxs("header", { children: [_jsx("strong", { children: student.name }), _jsx("span", { children: student.id })] }), _jsxs("p", { children: ["Status: ", student.status] }), _jsxs("p", { children: ["Camera: ", student.cameraVerified ? "Active" : "Not verified"] }), _jsxs("p", { children: ["Phone: ", student.phoneLinked ? "Linked" : "Not linked"] }), _jsxs("label", { children: ["Warning message", _jsx("input", { value: warnings[student.id] ?? "", onChange: (event) => {
                                                setWarnings((current) => ({ ...current, [student.id]: event.target.value }));
                                            } })] }), _jsx("button", { onClick: () => sendWarning(student.id), children: "Send Warning" })] }, student.id))) })] })] }));
}
