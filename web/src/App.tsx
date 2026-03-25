import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import { clearAuthState, getAuthState, setAuthState, type AuthState } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { StudentPage } from "./pages/StudentPage";

function ProtectedRoute(props: {
  auth: AuthState | null;
  role: "admin" | "student";
  children: JSX.Element;
}): JSX.Element {
  if (!props.auth) {
    return <Navigate to="/login" replace />;
  }

  if (props.auth.user.role !== props.role) {
    return <Navigate to={props.auth.user.role === "admin" ? "/admin" : "/student"} replace />;
  }

  return props.children;
}

export function App(): JSX.Element {
  const [auth, setAuth] = useState<AuthState | null>(() => getAuthState());

  const authActions = useMemo(
    () => ({
      login: (state: AuthState) => {
        setAuthState(state);
        setAuth(state);
      },
      logout: () => {
        clearAuthState();
        setAuth(null);
      }
    }),
    []
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage auth={auth} authActions={authActions} />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute auth={auth} role="admin">
            <AdminPage auth={auth} onLogout={authActions.logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student"
        element={
          <ProtectedRoute auth={auth} role="student">
            <StudentPage auth={auth} onLogout={authActions.logout} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={auth ? (auth.user.role === "admin" ? "/admin" : "/student") : "/login"} replace />} />
    </Routes>
  );
}
