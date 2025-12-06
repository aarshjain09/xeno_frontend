// src/pages/DashboardPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "../index.css";

const DashboardPage = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [ordersByDate, setOrdersByDate] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    setError("");
    try {
      const [summaryRes, ordersRes, topRes] = await Promise.all([
        api.get("/metrics/summary"),
        api.get("/metrics/orders-by-date", {
          params: {
            from: "2000-01-01",
            to: "2100-01-01",
          },
        }),
        api.get("/metrics/top-customers"),
      ]);
      setSummary(summaryRes.data);
      setOrdersByDate(ordersRes.data || []);
      setTopCustomers(normalizeTopCustomers(topRes.data || []));
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data. Try syncing or check backend."
      );
    }
  };

  const normalizeTopCustomers = (customers) =>
    customers.map((c) => {
      const name =
        c.name ||
        c.customerName ||
        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
        c.email ||
        "Unknown";
      return { ...c, label: name };
    });

  const handleSync = async () => {
    setError("");
    setMessage("");
    setIsSyncing(true);
    try {
      const res = await api.post("/sync/shopify");
      setMessage(res.data.message || "Sync completed.");
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Sync failed. Check Shopify credentials / server logs."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Dashboard</h1>
        <div className="header-right">
          <button className="btn-secondary" onClick={handleSync}>
            {isSyncing ? "Syncing..." : "Sync from Shopify"}
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {(message || error) && (
        <div className="messages">
          {message && <div className="msg msg-success">{message}</div>}
          {error && <div className="msg msg-error">{error}</div>}
        </div>
      )}

      <main className="app-main">
        {/* Summary cards */}
        <section className="right-panel">
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Total Customers</span>
              <span className="summary-value">
                {summary ? summary.totalCustomers : "--"}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Orders</span>
              <span className="summary-value">
                {summary ? summary.totalOrders : "--"}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Revenue</span>
              <span className="summary-value">
                {summary ? `₹${summary.totalRevenue.toFixed(2)}` : "--"}
              </span>
            </div>
          </div>

          <div className="charts-layout">
            {/* Graph 1: Revenue over time */}
            <div className="card chart-card">
              <h2 className="card-title">Revenue Over Time</h2>
              {ordersByDate && ordersByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={ordersByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="card-note">
                  No orders yet. Create orders in Shopify and sync.
                </p>
              )}
            </div>

            {/* Graph 2: Orders count over time */}
            <div className="card chart-card">
              <h2 className="card-title">Orders Per Day</h2>
              {ordersByDate && ordersByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ordersByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="card-note">
                  No orders yet. Create orders in Shopify and sync.
                </p>
              )}
            </div>

            {/* "Graph" 3 + table: top customers */}
            <div className="card chart-card">
              <h2 className="card-title">Top Customers by Spend</h2>
              {topCustomers && topCustomers.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topCustomers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalSpend" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                  <table className="simple-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Total Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((c) => (
                        <tr key={c.id}>
                          <td>{c.shopifyCustomerId}</td>
                          <td>₹{Number(c.totalSpend).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="card-note">
                  No top customers yet. Once orders exist, sync and check again.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
