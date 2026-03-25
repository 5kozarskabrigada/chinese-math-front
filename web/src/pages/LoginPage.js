import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
export function LoginPage(props) {
    const [id, setId] = useState("stu-1001");
    const [password, setPassword] = useState("student123");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    if (props.auth) {
        return _jsx(Navigate, { to: props.auth.user.role === "admin" ? "/admin" : "/student", replace: true });
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await apiRequest({
                path: "/auth/login",
                method: "POST",
                body: { id, password }
            });
            props.authActions.login(result);
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Login failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("main", { className: "login-page", children: _jsxs("section", { className: "panel", children: [_jsx("h1", { children: "Secure Examination Login" }), _jsx("p", { className: "muted", children: "Use admin or student credentials to continue." }), _jsxs("form", { onSubmit: handleSubmit, className: "stack", children: [_jsxs("label", { children: ["ID", _jsx("input", { value: id, onChange: (event) => setId(event.target.value), required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true })] }), error ? _jsx("div", { className: "error", children: error }) : null, _jsx("button", { type: "submit", disabled: loading, children: loading ? "Signing in..." : "Sign In" })] }), _jsx("div", { className: "hint", children: "Admin demo: admin-1 / admin123" })] }) }));
}
