import React, { useState } from 'react';
import './Instructions.css';

export default function Instructions({ authData, onStart }) {
  const [agreed, setAgreed] = useState(false);

  const sections = [
    { name: 'SOC Fundamentals', questions: 50, topics: 'Threat Detection, SIEM, IOCs, MITRE ATT&CK, Alert Triage' },
    { name: 'Incident Response', questions: 50, topics: 'IR Lifecycle, Digital Forensics, Malware Analysis, SOAR, Evidence Handling' },
    { name: 'Splunk & Wazuh Tools', questions: 50, topics: 'SPL Queries, Dashboards, Wazuh Rules, Log Analysis, Active Response' }
  ];

  return (
    <div className="instructions-page">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />

      <div className="inst-header">
        <div className="inst-logo">🛡️ MCET EXAMINATION PORTAL</div>
        <div className="inst-candidate">
          <span className="cand-label">CANDIDATE:</span>
          <span className="cand-name">{authData?.student?.name}</span>
          <span className="cand-roll">[ {authData?.student?.rollNo} ]</span>
        </div>
      </div>

      <div className="inst-content">
        <div className="inst-title-area">
          <h2 className="inst-title">EXAMINATION INSTRUCTIONS</h2>
          <div className="inst-title-line" />
          <p className="inst-subtitle">Read carefully before proceeding to the exam</p>
        </div>

        <div className="inst-overview">
          <div className="overview-stat"><div className="stat-val">150</div><div className="stat-lbl">MINUTES</div></div>
          <div className="overview-divider" />
          <div className="overview-stat"><div className="stat-val">150</div><div className="stat-lbl">QUESTIONS</div></div>
          <div className="overview-divider" />
          <div className="overview-stat"><div className="stat-val">3</div><div className="stat-lbl">SECTIONS</div></div>
          <div className="overview-divider" />
          <div className="overview-stat"><div className="stat-val">+1</div><div className="stat-lbl">PER CORRECT</div></div>
        </div>

        <div className="inst-sections">
          {sections.map((s, i) => (
            <div key={i} className="section-card">
              <div className="sec-num">SECTION {i + 1}</div>
              <div className="sec-info">
                <div className="sec-name">{s.name}</div>
                <div className="sec-topics">{s.topics}</div>
              </div>
              <div className="sec-count">{s.questions}<span>QNS</span></div>
            </div>
          ))}
        </div>

        <div className="inst-rules">
          <div className="rules-header"><span>⚠</span> IMPORTANT RULES & REGULATIONS</div>
          <div className="rules-grid">
            {[
              { icon: '🔒', text: 'This exam uses end-to-end encryption. Your session is monitored.' },
              { icon: '📱', text: 'Only ONE device session allowed. Multiple logins will terminate your exam.' },
              { icon: '🚫', text: 'Tab switching is strictly monitored and logged. Excessive switching leads to auto-submission.' },
              { icon: '⏰', text: 'Timer is server-side. Reconnecting does NOT reset the timer.' },
              { icon: '💾', text: 'Answers auto-save every 30 seconds. You can change answers any time before submission.' },
              { icon: '🎯', text: 'Each correct answer: +1 mark. No negative marking for wrong answers.' },
              { icon: '🔍', text: 'Right-click, copy-paste, and developer tools are disabled during exam.' },
              { icon: '📋', text: 'Once submitted, you cannot re-enter the exam. Submission is final.' },
              { icon: '⚡', text: 'Exam auto-submits when time expires. Ensure stable internet connection.' },
              { icon: '🛡️', text: 'Any form of malpractice will result in immediate disqualification and reporting.' }
            ].map((r, i) => (
              <div key={i} className="rule-item">
                <span className="rule-icon">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="nav-guide">
          <div className="nav-title">QUESTION PALETTE GUIDE</div>
          <div className="palette-legend">
            <div className="legend-item"><div className="legend-dot answered" /><span>Answered</span></div>
            <div className="legend-item"><div className="legend-dot not-visited" /><span>Not Visited</span></div>
            <div className="legend-item"><div className="legend-dot marked" /><span>Marked for Review</span></div>
            <div className="legend-item"><div className="legend-dot not-answered" /><span>Not Answered</span></div>
            <div className="legend-item"><div className="legend-dot marked-answered" /><span>Marked + Answered</span></div>
          </div>
        </div>

        <div className="inst-agree">
          <label className="agree-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="agree-checkbox"
            />
            <span className="agree-custom" />
            <span className="agree-text">
              I have read and understood all the instructions. I declare that I will not use any unfair means during this examination.
            </span>
          </label>
        </div>

        <button
          className={`start-btn ${agreed ? 'active' : ''}`}
          onClick={onStart}
          disabled={!agreed}
        >
          <span>▶▶</span> PROCEED TO EXAMINATION
        </button>
      </div>
    </div>
  );
}