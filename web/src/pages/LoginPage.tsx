import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight, BookOpen, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
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
      <div className="login-orb login-orb-left" />
      <div className="login-orb login-orb-right" />
      <section className="panel login-panel">
        <div className="login-brand-mark">
          <BookOpen size={28} />
        </div>
        <div className="login-panel-header">
          <h1>Welcome Back</h1>
          <p className="muted">Sign in to manage classrooms, publish exams, and monitor student sessions.</p>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <div className="input-group">
            <label>Username</label>
            <div className="input-with-icon">
              <div className="input-icon-left">
                <User size={18} />
              </div>
              <input 
                type="text"
                value={id} 
                onChange={(event) => setId(event.target.value)} 
                placeholder="Enter your username"
                required 
              />
            </div>
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div className="input-with-icon">
              <div className="input-icon-left">
                <Lock size={18} />
              </div>
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
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          {error ? <div className="error">{error}</div> : null}
          
          <button type="submit" disabled={loading} className="login-submit-button">
            {loading ? "Signing in..." : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        
        <div className="login-footer-note">
          <div className="login-note-row">
            <ShieldCheck size={16} />
            <span>Use your administrator credentials to access the control panel.</span>
          </div>
        </div>

        <div className="hint login-demo-hint">
          <strong>Demo Accounts</strong><br />
          Admin: admin-1 / admin123<br />
          Student: stu-1001 / student123
        </div>
      </section>
    </main>
  );
}
