import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './Exam.css';

const SECTION_NAMES = ['SOC Fundamentals', 'Incident Response', 'Splunk & Wazuh Tools'];

export default function Exam({ authData, onSubmit }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150 * 60);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPalette, setShowPalette] = useState(true);
  const token = localStorage.getItem('exam_token');
  const autoSaveRef = useRef(null);
  const timerRef = useRef(null);

  const getHeaders = () => ({ Authorization: `Bearer ${token}` });

  useEffect(() => {
    const load = async () => {
      try {
        const [qRes, aRes] = await Promise.all([
          axios.get('/api/questions', { headers: getHeaders() }),
          axios.get('/api/answers', { headers: getHeaders() })
        ]);
        setQuestions(qRes.data.questions);
        const elapsed = Math.floor((aRes.data.serverTime - aRes.data.startTime) / 1000);
        const remaining = Math.max(0, 150 * 60 - elapsed);
        setTimeLeft(remaining);
        setAnswers(aRes.data.answers || {});
        setMarkedForReview(aRes.data.markedForReview || {});
        setTabWarnings(aRes.data.tabSwitches || 0);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions]);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      Object.entries(answers).forEach(([qId, sel]) => {
        axios.post('/api/answer', { questionId: parseInt(qId), selectedOption: sel }, { headers: getHeaders() }).catch(() => {});
      });
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [answers]);

  useEffect(() => {
    const handleBlur = () => {
      axios.post('/api/log-tabswitch', {}, { headers: getHeaders() }).then(res => {
        const count = res.data.tabSwitches;
        setTabWarnings(count);
        if (count <= 3) {
          setWarningMsg(`⚠ Tab switch detected! (${count}/3) Repeated violations will auto-submit your exam.`);
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 4000);
        } else {
          handleAutoSubmit();
        }
      }).catch(() => {});
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    const blockKeys = (e) => {
      if (e.ctrlKey && ['c','v','u','a','s','p','f'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key))) e.preventDefault();
      if (e.altKey && e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', blockKeys);
    return () => document.removeEventListener('keydown', blockKeys);
  }, []);

  const sectionQuestions = (secIdx) => questions.filter(q => q.section === secIdx + 1);

  const handleAnswer = async (qId, optIdx) => {
    const newAnswers = { ...answers, [qId]: optIdx };
    setAnswers(newAnswers);
    try {
      await axios.post('/api/answer', { questionId: qId, selectedOption: optIdx }, { headers: getHeaders() });
    } catch {}
  };

  const handleMarkReview = async (qId) => {
    const newMark = { ...markedForReview, [qId]: !markedForReview[qId] };
    setMarkedForReview(newMark);
    try {
      await axios.post('/api/answer', { questionId: qId, selectedOption: answers[qId] ?? null, markedForReview: newMark[qId] }, { headers: getHeaders() });
    } catch {}
  };

  const handleClearAnswer = (qId) => {
    const newAnswers = { ...answers };
    delete newAnswers[qId];
    setAnswers(newAnswers);
    axios.post('/api/answer', { questionId: qId, selectedOption: null }, { headers: getHeaders() }).catch(() => {});
  };

  const handleAutoSubmit = useCallback(async () => {
    clearInterval(timerRef.current);
    clearInterval(autoSaveRef.current);
    try {
      const res = await axios.post('/api/submit', {}, { headers: getHeaders() });
      onSubmit(res.data);
    } catch {}
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    clearInterval(timerRef.current);
    clearInterval(autoSaveRef.current);
    try {
      const res = await axios.post('/api/submit', {}, { headers: getHeaders() });
      onSubmit(res.data);
    } catch {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const getQuestionStatus = (q) => {
    const answered = answers[q.id] !== undefined;
    const marked = markedForReview[q.id];
    if (marked && answered) return 'marked-answered';
    if (marked) return 'marked';
    if (answered) return 'answered';
    if (q.id === questions[currentQ]?.id) return 'current';
    return 'not-visited';
  };

  const totalAnswered = Object.keys(answers).length;
  const totalMarked = Object.values(markedForReview).filter(Boolean).length;
  const totalNotAnswered = questions.length - totalAnswered;
  const timePercent = (timeLeft / (150 * 60)) * 100;
  const isLowTime = timeLeft < 300;
  const currentQuestion = questions[currentQ];

  if (loading) return (
    <div className="exam-loading">
      <div className="loading-ring" />
      <p>LOADING EXAM DATA...</p>
    </div>
  );

  return (
    <div className="exam-page">
      <div className="cyber-grid-bg" />
      <div className="scanline-overlay" />

      <div className="exam-topbar">
        <div className="topbar-left">
          <span className="tb-logo">🛡️ MCET EXAMINATION</span>
          <span className="tb-candidate">{authData?.student?.name} | {authData?.student?.rollNo}</span>
        </div>
        <div className={`exam-timer ${isLowTime ? 'low-time' : ''}`}>
          <span className="timer-label">TIME LEFT</span>
          <span className="timer-val">{formatTime(timeLeft)}</span>
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${timePercent}%`, background: isLowTime ? 'var(--red)' : 'var(--cyan)' }} />
          </div>
        </div>
        <div className="topbar-right">
          {tabWarnings > 0 && (
            <div className="tab-warn-badge">⚠ TAB SWITCHES: {tabWarnings}/3</div>
          )}
          <button className="submit-topbar-btn" onClick={() => setShowSubmitConfirm(true)}>
            SUBMIT EXAM
          </button>
        </div>
      </div>

      <div className="section-tabs">
        {SECTION_NAMES.map((name, i) => {
          const sq = sectionQuestions(i);
          const answeredInSection = sq.filter(q => answers[q.id] !== undefined).length;
          return (
            <button
              key={i}
              className={`sec-tab ${currentSection === i ? 'active' : ''}`}
              onClick={() => {
                setCurrentSection(i);
                const firstIdx = questions.findIndex(q => q.section === i + 1);
                if (firstIdx >= 0) setCurrentQ(firstIdx);
              }}
            >
              <span className="sec-tab-num">SECTION {i + 1}</span>
              <span className="sec-tab-name">{name}</span>
              <span className="sec-tab-progress">{answeredInSection}/{sq.length}</span>
            </button>
          );
        })}
      </div>

      <div className="exam-main">
        <div className="question-area">
          {currentQuestion && (
            <>
              <div className="q-header">
                <div className="q-number-badge">Q {currentQ + 1} <span>/ {questions.length}</span></div>
                <div className="q-section-tag">{currentQuestion.section_name}</div>
                {markedForReview[currentQuestion.id] && <div className="q-marked-tag">🔖 MARKED FOR REVIEW</div>}
              </div>

              <div className="q-text">{currentQuestion.question}</div>

              <div className="q-options">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`option-btn ${answers[currentQuestion.id] === i ? 'selected' : ''}`}
                    onClick={() => handleAnswer(currentQuestion.id, i)}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="opt-text">{opt}</span>
                    {answers[currentQuestion.id] === i && <span className="opt-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="q-actions">
                <button className="action-btn mark-btn" onClick={() => handleMarkReview(currentQuestion.id)}>
                  {markedForReview[currentQuestion.id] ? '🔖 UNMARK' : '🔖 MARK FOR REVIEW'}
                </button>
                <button className="action-btn clear-btn" onClick={() => handleClearAnswer(currentQuestion.id)}>
                  ✕ CLEAR RESPONSE
                </button>
                <div className="nav-btns">
                  <button className="nav-btn" onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}>← PREV</button>
                  <button className="nav-btn primary" onClick={() => {
                    if (currentQ < questions.length - 1) {
                      setCurrentQ(p => p + 1);
                      const nextQ = questions[currentQ + 1];
                      if (nextQ) setCurrentSection(nextQ.section - 1);
                    }
                  }} disabled={currentQ === questions.length - 1}>NEXT →</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`palette-sidebar ${showPalette ? 'open' : 'closed'}`}>
          <button className="palette-toggle" onClick={() => setShowPalette(p => !p)}>
            {showPalette ? '▶' : '◀'} PALETTE
          </button>
          {showPalette && (
            <>
              <div className="palette-stats">
                <div className="pstat answered"><div className="pstat-num">{totalAnswered}</div><div className="pstat-lbl">Answered</div></div>
                <div className="pstat not-answered"><div className="pstat-num">{totalNotAnswered}</div><div className="pstat-lbl">Unanswered</div></div>
                <div className="pstat marked"><div className="pstat-num">{totalMarked}</div><div className="pstat-lbl">Marked</div></div>
              </div>
              {SECTION_NAMES.map((secName, secIdx) => (
                <div key={secIdx} className="palette-section">
                  <div className="pal-sec-header">SEC {secIdx + 1}: {secName.split(' ')[0].toUpperCase()}</div>
                  <div className="palette-grid">
                    {sectionQuestions(secIdx).map((q) => {
                      const globalIdx = questions.indexOf(q);
                      const status = getQuestionStatus(q);
                      return (
                        <button
                          key={q.id}
                          className={`pal-btn ${status} ${globalIdx === currentQ ? 'active' : ''}`}
                          onClick={() => { setCurrentQ(globalIdx); setCurrentSection(secIdx); }}
                        >
                          {globalIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="pal-legend">
                <div className="pal-leg-item"><div className="pal-leg-dot answered" />Answered</div>
                <div className="pal-leg-item"><div className="pal-leg-dot not-visited" />Not Visited</div>
                <div className="pal-leg-item"><div className="pal-leg-dot marked" />Marked</div>
                <div className="pal-leg-item"><div className="pal-leg-dot marked-answered" />Marked+Ans</div>
              </div>
            </>
          )}
        </div>
      </div>

      {showWarning && <div className="warning-toast">{warningMsg}</div>}

      {showSubmitConfirm && (
        <div className="modal-overlay" onClick={() => !submitting && setShowSubmitConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="corner-bracket tl" /><div className="corner-bracket tr" />
            <div className="corner-bracket bl" /><div className="corner-bracket br" />
            <div className="modal-title">⚠ CONFIRM SUBMISSION</div>
            <div className="modal-stats">
              <div className="mstat"><span className="mstat-v answered-color">{totalAnswered}</span><span>Answered</span></div>
              <div className="mstat"><span className="mstat-v red-color">{totalNotAnswered}</span><span>Unanswered</span></div>
              <div className="mstat"><span className="mstat-v orange-color">{totalMarked}</span><span>Marked</span></div>
            </div>
            <p className="modal-warn">Once submitted, you <strong>cannot</strong> re-enter the exam. This action is irreversible.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>← GO BACK</button>
              <button className="modal-btn confirm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '◐ SUBMITTING...' : '✓ SUBMIT EXAM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}