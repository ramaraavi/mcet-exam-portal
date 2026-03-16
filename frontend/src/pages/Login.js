import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';

export default function Login({ onLogin }) {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 5,
      char: String.fromCharCode(0x30A0 + Math.random() * 96)
    }));
    setParticles(p);

    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 4000);
    return () => clearInterval(glitchInterval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/login', { rollNo: rollNo.trim().toUpperCase(), password });
      localStorage.setItem('exam_token', res.data.token);
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />

      <div className="matrix-rain">
        {particles.map(p => (
          <div key={p.id} className="matrix-char" style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}>{p.char}</div>
        ))}
      </div>

      <div className="login-header">
        <div className="header-left">
          <div className="shield-icon">🛡️</div>
          <span className="header-org">MCET — CYBERSECURITY FINAL ASSESSMENT</span>
        </div>
        <div className="header-right">
          <div className="status-dot" />
          <span>SECURE SESSION</span>
          <span className="powered-by">Powered by EthicalByte</span>
        </div>
      </div>

      <div className="login-center">
        <div className="login-card">
          <div className="corner-bracket tl" /><div className="corner-bracket tr" />
          <div className="corner-bracket bl" /><div className="corner-bracket br" />

          <div className="login-logo">
            <div className="hex-container">
              <div className="hex-ring" />
              <div className="hex-inner">
                <span className="hex-icon">⬡</span>
              </div>
            </div>
            <h1 className={`login-title ${glitchActive ? 'glitch' : ''}`}>
              MCET<span className="title-accent">_</span>EXAM
            </h1>
            <p className="login-subtitle">Cybersecurity Final Assessment Portal</p>
            <div className="title-line" />
          </div>

          <div className="exam-badges">
            <div className="badge"><span className="badge-icon">⏱</span>150 MIN</div>
            <div className="badge"><span className="badge-icon">📋</span>150 QNS</div>
            <div className="badge"><span className="badge-icon">🔒</span>SECURE</div>
            <div className="badge"><span className="badge-icon">🎯</span>3 SECTIONS</div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="field-group">
              <label className="field-label">
                <span className="label-prefix">01//</span> CANDIDATE ID
              </label>
              <div className="input-wrapper">
                <span className="input-prefix">🎓</span>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Enter your Roll Number"
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  required
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="input-glow" />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">
                <span className="label-prefix">02//</span> ACCESS KEY
              </label>
              <div className="input-wrapper">
                <span className="input-prefix">🔑</span>
                <input
                  type="password"
                  className="cyber-input"
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                />
                <div className="input-glow" />
              </div>
            </div>

            {error && (
              <div className="error-box">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? (
                <><span className="spinner">◐</span> AUTHENTICATING...</>
              ) : (
                <><span>▶</span> INITIATE SECURE LOGIN</>
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="warning-strip">
              <span>⚠</span> This exam is monitored. Tab switching will be logged. Use of unfair means will result in disqualification.
            </div>
            <div className="sys-info">
              <span>SYS: ONLINE</span>
              <span className="blink-dot">●</span>
              <span>ENC: AES-256</span>
              <span className="blink-dot">●</span>
              <span>MCET 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}