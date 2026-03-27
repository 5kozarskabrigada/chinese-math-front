import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";

export function LoginPage(props: {
  auth: AuthState | null;
  authActions: { login: (state: AuthState) => void };
}): JSX.Element {
  const [id, setId] = useState("stu-1001");
  const [password, setPassword] = useState("student123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (props.auth) {
    return <Navigate to={props.auth.user.role === "admin" ? "/admin" : "/student"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest<{ token: string; user: AuthState["user"] }>({
        path: "/auth/login",
        method: "POST",
        body: { id, password }
      });
      props.authActions.login(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="panel">
        <h1>Chinese Math Mock Exam</h1>
        <p className="muted">Welcome! Please sign in to continue to your examination dashboard.</p>
        
        <form onSubmit={handleSubmit} className="stack">
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text"
              value={id} 
              onChange={(event) => setId(event.target.value)} 
              placeholder="Enter your username"
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"}
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                placeholder="Enter your password"
                required 
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>
          
          {error ? <div className="error">❌ {error}</div> : null}
          
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        
        <div className="hint">
          <strong>Demo Accounts:</strong><br />
          👨‍💼 Admin: admin-1 / admin123<br />
          🎓 Student: stu-1001 / student123
        </div>
      </section>
    </main>
  );
}
