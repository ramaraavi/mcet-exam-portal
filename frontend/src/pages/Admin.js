import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('submitted');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = async (key) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/results', {
        headers: { 'x-admin-key': key || adminKey }
      });
      if (res.status === 403) { setError('Invalid admin key!'); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
      setError('');
    } catch (err) {
      setError('Failed to fetch data. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchData(adminKey);
  };

  useEffect(() => {
    if (authenticated && autoRefresh) {
      const interval = setInterval(() => fetchData(), 10000);
      return () => clearInterval(interval);
    }
  }, [authenticated, autoRefresh]);

  const formatTime = (secs) => {
    if (!secs) return 'N/A';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getGrade = (score) => {
    const pct = (score / 150) * 100;
    if (pct >= 80) return { grade: 'A+', color: 'var(--green)' };
    if (pct >= 60) return { grade: 'A', color: 'var(--cyan)' };
    if (pct >= 40) return { grade: 'B', color: 'var(--yellow)' };
    return { grade: 'C', color: 'var(--red)' };
  };

  if (!authenticated) return (
    <div className="admin-login">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />
      <div className="admin-login-card">
        <div className="corner-bracket tl" /><div className="corner-bracket tr" />
        <div className="corner-bracket bl" /><div className="corner-bracket br" />
        <div className="admin-login-title">🛡️ ADMIN PANEL</div>
        <div className="admin-login-sub">MCET Examination Portal</div>
        <form onSubmit={handleLogin} className="admin-login-form">
          <input
            type="password"
            className="admin-key-input"
            placeholder="Enter Admin Key"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            required
          />
          {error && <div className="admin-error">⚠ {error}</div>}
          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? '◐ LOADING...' : '▶ ACCESS DASHBOARD'}
          </button>
        </form>
      </div>
    </div>
  );

  const submitted = data?.submitted || [];
  const active = data?.active || [];

  return (
    <div className="admin-page">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />

      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-logo">🛡️ MCET ADMIN DASHBOARD</span>
          <span className="admin-header-sub">Examination Control Panel</span>
        </div>
        <div className="admin-header-right">
          <label className="refresh-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            <span>AUTO REFRESH (10s)</span>
          </label>
          <button className="admin-refresh-btn" onClick={() => fetchData()}>⟳ REFRESH</button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="asc-val">{submitted.length}</div>
          <div className="asc-lbl">SUBMITTED</div>
        </div>
        <div className="admin-stat-card active-card">
          <div className="asc-val">{active.length}</div>
          <div className="asc-lbl">ACTIVE NOW</div>
        </div>
        <div className="admin-stat-card">
          <div className="asc-val">{60 - submitted.length - active.length}</div>
          <div className="asc-lbl">NOT STARTED</div>
        </div>
        <div className="admin-stat-card">
          <div className="asc-val">
            {submitted.length > 0 ? (submitted.reduce((a, s) => a + s.totalCorrect, 0) / submitted.length).toFixed(1) : 'N/A'}
          </div>
          <div className="asc-lbl">AVG SCORE</div>
        </div>
        <div className="admin-stat-card">
          <div className="asc-val">
            {submitted.length > 0 ? Math.max(...submitted.map(s => s.totalCorrect)) : 'N/A'}
          </div>
          <div className="asc-lbl">HIGHEST</div>
        </div>
        <div className="admin-stat-card">
          <div className="asc-val">
            {submitted.length > 0 ? Math.min(...submitted.map(s => s.totalCorrect)) : 'N/A'}
          </div>
          <div className="asc-lbl">LOWEST</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'submitted' ? 'active' : ''}`} onClick={() => setActiveTab('submitted')}>
          ✅ SUBMITTED ({submitted.length})
        </button>
        <button className={`admin-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          👀 ACTIVE ({active.length})
        </button>
        <button className={`admin-tab ${activeTab === 'credentials' ? 'active' : ''}`} onClick={() => setActiveTab('credentials')}>
          🔑 CREDENTIALS
        </button>
      </div>

      {/* Submitted results table */}
      {activeTab === 'submitted' && (
        <div className="admin-table-wrap">
          {submitted.length === 0 ? (
            <div className="admin-empty">No submissions yet</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NAME</th>
                  <th>ROLL NO</th>
                  <th>SCORE</th>
                  <th>%</th>
                  <th>GRADE</th>
                  <th>SOC</th>
                  <th>IR</th>
                  <th>SPLUNK</th>
                  <th>ATTEMPTED</th>
                  <th>TAB SWITCHES</th>
                  <th>TIME TAKEN</th>
                  <th>SUBMITTED AT</th>
                </tr>
              </thead>
              <tbody>
                {submitted.sort((a, b) => b.totalCorrect - a.totalCorrect).map((s, i) => {
                  const pct = ((s.totalCorrect / 150) * 100).toFixed(1);
                  const { grade, color } = getGrade(s.totalCorrect);
                  return (
                    <tr key={s.rollNo} className={i === 0 ? 'top-row' : ''}>
                      <td>{i + 1}</td>
                      <td className="name-cell">{s.name}</td>
                      <td className="roll-cell">{s.rollNo}</td>
                      <td className="score-cell" style={{ color: 'var(--cyan)' }}>{s.totalCorrect}/150</td>
                      <td style={{ color }}>{pct}%</td>
                      <td><span className="grade-badge" style={{ borderColor: color, color }}>{grade}</span></td>
                      <td>{s.sectionScores?.[1]?.correct || 0}/50</td>
                      <td>{s.sectionScores?.[2]?.correct || 0}/50</td>
                      <td>{s.sectionScores?.[3]?.correct || 0}/50</td>
                      <td>{s.totalAttempted}/150</td>
                      <td className={s.tabSwitches > 2 ? 'warn-cell' : ''}>{s.tabSwitches}</td>
                      <td>{formatTime(s.timeTaken)}</td>
                      <td className="time-cell">{new Date(s.submittedAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Active students */}
      {activeTab === 'active' && (
        <div className="admin-table-wrap">
          {active.length === 0 ? (
            <div className="admin-empty">No students currently active</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NAME</th>
                  <th>ROLL NO</th>
                  <th>ANSWERED</th>
                  <th>TIME ELAPSED</th>
                  <th>TIME LEFT</th>
                  <th>TAB SWITCHES</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {active.map((s, i) => {
                  const timeLeft = Math.max(0, 150 * 60 - s.elapsed);
                  return (
                    <tr key={s.rollNo}>
                      <td>{i + 1}</td>
                      <td className="name-cell">{s.name}</td>
                      <td className="roll-cell">{s.rollNo}</td>
                      <td className="score-cell">{s.answered}/150</td>
                      <td>{formatTime(s.elapsed)}</td>
                      <td style={{ color: timeLeft < 300 ? 'var(--red)' : 'var(--green)' }}>{formatTime(timeLeft)}</td>
                      <td className={s.tabSwitches > 2 ? 'warn-cell' : ''}>{s.tabSwitches}</td>
                      <td><span className="status-live">● LIVE</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Credentials */}
      {activeTab === 'credentials' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>NAME</th>
                <th>ROLL NO</th>
                <th>PASSWORD</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(data?.students || []).map((s, i) => (
                <tr key={s.rollNo}>
                  <td>{i + 1}</td>
                  <td className="name-cell">{s.name}</td>
                  <td className="roll-cell">{s.rollNo}</td>
                  <td className="pass-cell">{s.password}</td>
                  <td>
                    {submitted.find(x => x.rollNo === s.rollNo) ? (
                      <span style={{ color: 'var(--green)' }}>✓ SUBMITTED</span>
                    ) : active.find(x => x.rollNo === s.rollNo) ? (
                      <span style={{ color: 'var(--cyan)' }}>● ACTIVE</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>○ NOT STARTED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}