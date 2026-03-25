import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { connectSocket } from "../lib/socket";
export function StudentPage(props) {
    const [profile, setProfile] = useState(null);
    const [examCode, setExamCode] = useState("123456");
    const [joinedExam, setJoinedExam] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [activeWarningId, setActiveWarningId] = useState(null);
    const [warning, setWarning] = useState(null);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    useEffect(() => {
        let isMounted = true;
        async function loadMe() {
            try {
                const result = await apiRequest({ path: "/student/me", auth: props.auth });
                if (isMounted) {
                    setProfile(result);
                }
            }
            catch (requestError) {
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
        socket.on("student:warning", (payload) => {
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
        const updated = await apiRequest({ path: "/student/me", auth: props.auth });
        setProfile(updated);
    }
    async function linkPhone() {
        await apiRequest({ path: "/student/link-phone", method: "POST", auth: props.auth });
        const updated = await apiRequest({ path: "/student/me", auth: props.auth });
        setProfile(updated);
    }
    async function startExam() {
        if (!profile) {
            return;
        }
        setError(null);
        try {
            const result = await apiRequest({
                path: "/student/join-exam",
                method: "POST",
                auth: props.auth,
                body: { code: examCode }
            });
            await document.documentElement.requestFullscreen();
            setJoinedExam(result.exam);
            setRemainingSeconds(result.exam.timeLimitMinutes * 60);
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to start exam");
        }
    }
    if (!profile) {
        return _jsx("main", { className: "loading", children: "Loading student profile..." });
    }
    const warningVisible = warning && isPaused;
    return (_jsxs("main", { className: "student-layout", children: [_jsxs("header", { className: "exam-header", children: [_jsxs("div", { children: [profile.id, " \u00B7 Mathematics \u00B7 Subject MATH-01"] }), _jsx("h1", { children: "Mathematics \u2013 National Standardized Test" }), _jsx("div", { className: remainingSeconds <= 300 ? "timer danger" : remainingSeconds <= 900 ? "timer warn" : "timer", children: timerText })] }), _jsx("div", { className: "warning-strip", children: "Do not leave the exam interface. All actions are monitored." }), !joinedExam ? (_jsxs("section", { className: "panel stack", children: [_jsx("h2", { children: "Pre-Exam Verification" }), _jsx("p", { children: "1) Laptop camera verification 2) Phone camera linkage" }), _jsxs("div", { className: "row", children: [_jsx("button", { onClick: verifyCamera, disabled: profile.cameraVerified, children: profile.cameraVerified ? "Camera Verified" : "Verify Camera" }), _jsx("button", { onClick: linkPhone, disabled: profile.phoneLinked, children: profile.phoneLinked ? "Phone Linked" : "Link Phone" })] }), _jsxs("label", { children: ["Enter 6-digit exam code", _jsx("input", { value: examCode, onChange: (event) => setExamCode(event.target.value), maxLength: 6 })] }), _jsx("button", { onClick: startExam, disabled: !profile.cameraVerified || !profile.phoneLinked, children: "Start Exam" }), error ? _jsx("div", { className: "error", children: error }) : null, _jsx("button", { className: "text-button", onClick: props.onLogout, children: "Logout" })] })) : (_jsxs("section", { className: "exam-shell", children: [warningVisible ? (_jsxs("div", { className: "warning-modal stack", children: [_jsx("div", { children: warning }), _jsx("button", { onClick: () => {
                                    if (activeWarningId) {
                                        socketRef.current?.emit("student:warning_ack", { warningId: activeWarningId });
                                    }
                                    setIsPaused(false);
                                    setWarning(null);
                                    setActiveWarningId(null);
                                }, children: "Done" })] })) : null, _jsxs("article", { className: "question-card", children: [_jsx("h3", { children: "1. Solve for x:" }), _jsx("p", { className: "math", children: "$2x^2 - 5x - 3 = 0$" }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("input", { type: "radio", name: "q1" }), " (A) x = 3, -1/2"] }), _jsxs("li", { children: [_jsx("input", { type: "radio", name: "q1" }), " (B) x = 1, -3"] }), _jsxs("li", { children: [_jsx("input", { type: "radio", name: "q1" }), " (C) x = 2, -1"] }), _jsxs("li", { children: [_jsx("input", { type: "radio", name: "q1" }), " (D) x = 5, -3/2"] })] })] }), _jsxs("footer", { className: "control-bar", children: [_jsx("button", { children: "Previous" }), _jsxs("label", { children: [_jsx("input", { type: "checkbox" }), " Mark for Review"] }), _jsx("button", { children: "Next" }), _jsx("button", { className: "danger", onClick: async () => {
                                    await apiRequest({
                                        path: "/student/submit-exam",
                                        method: "POST",
                                        auth: props.auth,
                                        body: { examId: joinedExam.id }
                                    });
                                    setJoinedExam(null);
                                }, children: "Submit Exam" })] })] }))] }));
}
