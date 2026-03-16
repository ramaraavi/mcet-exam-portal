import React from 'react';
import './Result.css';

export default function Result({ data, student }) {
  if (!data) return null;

  const { score, totalAttempted, sectionScores } = data;
  const totalQ = 150;
  const percentage = ((score / totalQ) * 100).toFixed(1);

  const getGrade = (pct) => {
    if (pct >= 80) return { grade: 'A+', label: 'EXCEPTIONAL', color: 'var(--green)' };
    if (pct >= 60) return { grade: 'A', label: 'PROFICIENT', color: 'var(--cyan)' };
    if (pct >= 40) return { grade: 'B', label: 'DEVELOPING', color: 'var(--yellow)' };
    return { grade: 'C', label: 'NEEDS IMPROVEMENT', color: 'var(--red)' };
  };

  const { grade, label, color } = getGrade(parseFloat(percentage));
  const secNames = { 1: 'SOC Fundamentals', 2: 'Incident Response', 3: 'Splunk & Wazuh' };

  return (
    <div className="result-page">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />

      <div className="result-header">
        <div>🛡️ MCET EXAMINATION PORTAL</div>
        <div className="result-header-right">
          EXAMINATION COMPLETE
          <span className="powered-by">Powered by EthicalByte</span>
        </div>
      </div>

      <div className="result-content">
        <div className="submitted-banner">
          <span className="sub-icon">✓</span>
          <div>
            <div className="sub-title">EXAM SUBMITTED SUCCESSFULLY</div>
            <div className="sub-sub">Your responses have been recorded and encrypted</div>
          </div>
        </div>

        <div className="cand-result-info">
          <div className="cri-item"><span className="cri-label">CANDIDATE</span><span className="cri-val">{student?.name}</span></div>
          <div className="cri-item"><span className="cri-label">ROLL NO</span><span className="cri-val">{student?.rollNo}</span></div>
          <div className="cri-item"><span className="cri-label">SUBMITTED AT</span><span className="cri-val">{new Date().toLocaleString()}</span></div>
        </div>

        <div className="score-card">
          <div className="sc-left">
            <div className="sc-score-label">TOTAL SCORE</div>
            <div className="sc-score">{score}<span>/{totalQ}</span></div>
            <div className="sc-percent" style={{ color }}>{percentage}%</div>
            <div className="score-bar-wrap">
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${percentage}%`, background: color }} />
              </div>
            </div>
          </div>
          <div className="sc-right">
            <div className="grade-circle" style={{ borderColor: color, boxShadow: `0 0 40px ${color}55` }}>
              <div className="grade-letter" style={{ color }}>{grade}</div>
              <div className="grade-label" style={{ color }}>{label}</div>
            </div>
          </div>
        </div>

        <div className="attempt-stats">
          <div className="as-item answered"><div className="as-val">{totalAttempted}</div><div className="as-lbl">Attempted</div></div>
          <div className="as-item correct"><div className="as-val">{score}</div><div className="as-lbl">Correct</div></div>
          <div className="as-item wrong"><div className="as-val">{totalAttempted - score}</div><div className="as-lbl">Wrong</div></div>
          <div className="as-item skip"><div className="as-val">{totalQ - totalAttempted}</div><div className="as-lbl">Skipped</div></div>
        </div>

        <div className="section-breakdown">
          <div className="sb-title">SECTION-WISE PERFORMANCE</div>
          {[1, 2, 3].map(secNum => {
            const sec = sectionScores?.[secNum] || { correct: 0, attempted: 0 };
            const secPct = ((sec.correct / 50) * 100).toFixed(0);
            return (
              <div key={secNum} className="sb-row">
                <div className="sb-name">{secNames[secNum]}</div>
                <div className="sb-bar-wrap">
                  <div className="sb-bar-track">
                    <div className="sb-bar-fill" style={{ width: `${secPct}%` }} />
                  </div>
                </div>
                <div className="sb-score">{sec.correct}/50</div>
                <div className="sb-pct" style={{ color: secPct >= 60 ? 'var(--green)' : secPct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
                  {secPct}%
                </div>
              </div>
            );
          })}
        </div>

        <div className="result-note">
          <span>ℹ</span>
          Your detailed result report will be shared by the exam authority. This screen is for reference only.
          Please do not close this window until instructed by the invigilator.
        </div>
      </div>
    </div>
  );
}