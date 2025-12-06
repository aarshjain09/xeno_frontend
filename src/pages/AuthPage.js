// src/pages/AuthPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../index.css"; // make sure styles are applied

const AuthPage = () => {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    storeDomain: "",
    accessToken: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        // LOGIN FLOW
        const res = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.token);
        setMessage("Logged in successfully.");
        navigate("/dashboard");
      } else {
        // SIGNUP FLOW: register tenant + save store in one go
        const registerRes = await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        const token = registerRes.data.token;
        localStorage.setItem("token", token);

        // Now save Shopify store (domain + key)
        await api.post("/tenants/store", {
          storeDomain: sanitizeDomain(form.storeDomain),
          accessToken: form.accessToken,
        });

        setMessage("Account created and store connected.");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Authentication failed. Check your details and try again."
      );
    }
  };

  const sanitizeDomain = (domain) => {
    // remove protocol and /admin if user pasted full URL
    if (!domain) return "";
    return domain
      .replace("https://", "")
      .replace("http://", "")
      .replace(/\/admin\/?/, "")
      .replace(/\/$/, "");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Xeno Shopify Ingestion & Insights</h1>
      </header>

      <main className="app-main single-column">
        <section className="card auth-card">
          <div className="card-header">
            <button
              className={mode === "login" ? "tab-button active" : "tab-button"}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={mode === "signup" ? "tab-button active" : "tab-button"}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          {message && <div className="msg msg-success">{message}</div>}
          {error && <div className="msg msg-error">{error}</div>}

          <form className="card-body" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-group">
                <label>Tenant / Brand Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="e.g. Demo Brand"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                required
              />
            </div>

            {mode === "signup" && (
              <>
                <div className="form-group">
                  <label>Shopify Store Domain</label>
                  <input
                    name="storeDomain"
                    value={form.storeDomain}
                    onChange={onChange}
                    placeholder="your-store.myshopify.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Shopify Admin API Access Token</label>
                  <input
                    name="accessToken"
                    value={form.accessToken}
                    onChange={onChange}
                    placeholder="shpat_..."
                    required
                  />
                  <small className="help-text">
                    From Shopify &gt; Apps &gt; Develop apps &gt; Admin API
                    access token.
                  </small>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary">
              {mode === "login" ? "Login" : "Sign Up & Continue"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default AuthPage;
