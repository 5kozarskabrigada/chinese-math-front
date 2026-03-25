import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import { clearAuthState, getAuthState, setAuthState } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { StudentPage } from "./pages/StudentPage";
function ProtectedRoute(props) {
    if (!props.auth) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (props.auth.user.role !== props.role) {
        return _jsx(Navigate, { to: props.auth.user.role === "admin" ? "/admin" : "/student", replace: true });
    }
    return props.children;
}
export function App() {
    const [auth, setAuth] = useState(() => getAuthState());
    const authActions = useMemo(() => ({
        login: (state) => {
            setAuthState(state);
            setAuth(state);
        },
        logout: () => {
            clearAuthState();
            setAuth(null);
        }
    }), []);
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, { auth: auth, authActions: authActions }) }), _jsx(Route, { path: "/admin", element: _jsx(ProtectedRoute, { auth: auth, role: "admin", children: _jsx(AdminPage, { auth: auth, onLogout: authActions.logout }) }) }), _jsx(Route, { path: "/student", element: _jsx(ProtectedRoute, { auth: auth, role: "student", children: _jsx(StudentPage, { auth: auth, onLogout: authActions.logout }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: auth ? (auth.user.role === "admin" ? "/admin" : "/student") : "/login", replace: true }) })] }));
}
