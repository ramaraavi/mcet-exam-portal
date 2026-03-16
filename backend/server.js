const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

const studentsDb = require('./db/students');
const questions = require('./db/questions');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'blueteam_exam_2025_ultra_secret_key_xK9mP3nQ';
const EXAM_DURATION = 150 * 60;

let students = [...studentsDb];

const activeSessions = new Map();
const submittedExams = new Map();
const sessionTokens = new Map();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = activeSessions.get(token);
    if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    if (elapsed > EXAM_DURATION + 30) {
      activeSessions.delete(token);
      return res.status(401).json({ error: 'Exam time expired' });
    }
    session.lastActive = Date.now();
    req.student = decoded;
    req.session = session;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminAuth = (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_KEY || 'admin_blueteam_2025')) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
};

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getShuffledQuestions(rollNo) {
  const seed = rollNo.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const s1 = questions.filter(q => q.section === 1);
  const s2 = questions.filter(q => q.section === 2);
  const s3 = questions.filter(q => q.section === 3);
  return [
    ...seededShuffle(s1, seed),
    ...seededShuffle(s2, seed + 1),
    ...seededShuffle(s3, seed + 2)
  ];
}

function autoSubmitStudent(rollNo, session, token) {
  if (submittedExams.has(rollNo)) return null;
  const shuffled = getShuffledQuestions(rollNo);
  const answers = session.answers;
  let totalCorrect = 0, totalAttempted = 0;
  const sectionScores = { 1: { correct: 0, attempted: 0 }, 2: { correct: 0, attempted: 0 }, 3: { correct: 0, attempted: 0 } };
  shuffled.forEach(q => {
    const selected = answers[q.id];
    if (selected !== undefined && selected !== null) {
      totalAttempted++;
      sectionScores[q.section].attempted++;
      if (selected === q.correct) { totalCorrect++; sectionScores[q.section].correct++; }
    }
  });
  const result = {
    rollNo, name: session.name, answers, totalCorrect, totalAttempted,
    totalQuestions: 150, sectionScores, tabSwitches: session.tabSwitches,
    submittedAt: new Date().toISOString(),
    timeTaken: Math.floor((Date.now() - session.startTime) / 1000)
  };
  submittedExams.set(rollNo, result);
  activeSessions.delete(token);
  sessionTokens.delete(rollNo);
  return { autoSubmitted: true, score: totalCorrect, totalAttempted, sectionScores };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/api/login', loginLimiter, (req, res) => {
  const { rollNo, password } = req.body;
  if (!rollNo || !password) return res.status(400).json({ error: 'Roll number and password required' });
  const student = students.find(s => s.roll_no === rollNo.trim().toUpperCase());
  if (!student) return res.status(401).json({ error: 'Invalid credentials' });
  const validPass = bcrypt.compareSync(password, student.password_hash);
  if (!validPass) return res.status(401).json({ error: 'Invalid credentials' });
  if (submittedExams.has(student.roll_no)) return res.status(403).json({ error: 'Exam already submitted. You cannot re-enter.' });
  const existingToken = sessionTokens.get(student.roll_no);
  if (existingToken) activeSessions.delete(existingToken);
  const token = jwt.sign({ rollNo: student.roll_no, name: student.name, id: student.id }, JWT_SECRET, { expiresIn: '3h' });
  const session = {
    rollNo: student.roll_no,
    name: student.name,
    startTime: Date.now(),
    answers: {},
    tabSwitches: 0,
    markedForReview: {},
    lastActive: Date.now()
  };
  activeSessions.set(token, session);
  sessionTokens.set(student.roll_no, token);
  res.json({ token, student: { rollNo: student.roll_no, name: student.name }, examDuration: EXAM_DURATION, startTime: session.startTime });
});

app.get('/api/questions', authenticate, (req, res) => {
  const shuffled = getShuffledQuestions(req.student.rollNo);
  const sanitized = shuffled.map(q => ({
    id: q.id, section: q.section, section_name: q.section_name,
    question: q.question, options: q.options
  }));
  res.json({ questions: sanitized });
});

app.post('/api/answer', authenticate, (req, res) => {
  const { questionId, selectedOption, markedForReview } = req.body;
  if (questionId === undefined) return res.status(400).json({ error: 'Missing questionId' });
  req.session.answers[questionId] = selectedOption ?? null;
  if (markedForReview !== undefined) req.session.markedForReview[questionId] = markedForReview;
  res.json({ saved: true });
});

app.get('/api/answers', authenticate, (req, res) => {
  const elapsed = Math.floor((Date.now() - req.session.startTime) / 1000);
  const timeLeft = Math.max(0, EXAM_DURATION - elapsed);

  // Auto submit if time expired on reload
  if (timeLeft <= 0) {
    const result = autoSubmitStudent(req.student.rollNo, req.session, req.token);
    if (result) return res.json(result);
    return res.json({ autoSubmitted: true, score: 0, totalAttempted: 0, sectionScores: {} });
  }

  res.json({
    answers: req.session.answers,
    markedForReview: req.session.markedForReview,
    startTime: req.session.startTime,
    tabSwitches: req.session.tabSwitches,
    serverTime: Date.now(),
    timeLeft
  });
});

app.post('/api/log-tabswitch', authenticate, (req, res) => {
  req.session.tabSwitches++;
  res.json({ tabSwitches: req.session.tabSwitches });
});

app.post('/api/submit', authenticate, (req, res) => {
  const { rollNo } = req.student;
  if (submittedExams.has(rollNo)) return res.status(400).json({ error: 'Already submitted' });
  const result = autoSubmitStudent(rollNo, req.session, req.token);
  if (result) return res.json({ message: 'Exam submitted successfully', ...result });
  return res.status(400).json({ error: 'Submission failed' });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/results', (req, res) => {
  if (!adminAuth(req, res)) return;
  const results = [];
  submittedExams.forEach(r => results.push(r));
  const active = [];
  activeSessions.forEach((session) => {
    active.push({
      rollNo: session.rollNo, name: session.name,
      answered: Object.keys(session.answers).length,
      tabSwitches: session.tabSwitches,
      elapsed: Math.floor((Date.now() - session.startTime) / 1000)
    });
  });
  res.json({ submitted: results, active, students: students.map(s => ({ rollNo: s.roll_no, name: s.name, password: s.password_plain })) });
});

app.post('/api/admin/add-student', (req, res) => {
  if (!adminAuth(req, res)) return;
  const { roll_no, name, password_plain } = req.body;
  if (!roll_no || !name || !password_plain) return res.status(400).json({ error: 'All fields required' });
  const rollNoUpper = roll_no.trim().toUpperCase();
  if (students.find(s => s.roll_no === rollNoUpper)) return res.status(400).json({ error: 'Roll number already exists' });
  const newStudent = {
    id: students.length + 1,
    roll_no: rollNoUpper,
    name: name.trim(),
    password_plain,
    password_hash: bcrypt.hashSync(password_plain, 10)
  };
  students.push(newStudent);
  res.json({ message: 'Student added successfully', student: { rollNo: newStudent.roll_no, name: newStudent.name } });
});

app.delete('/api/admin/delete-student/:rollNo', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rollNo = req.params.rollNo.toUpperCase();
  const index = students.findIndex(s => s.roll_no === rollNo);
  if (index === -1) return res.status(404).json({ error: 'Student not found' });
  students.splice(index, 1);
  const token = sessionTokens.get(rollNo);
  if (token) activeSessions.delete(token);
  sessionTokens.delete(rollNo);
  res.json({ message: 'Student deleted successfully' });
});

// ─── Beacon Submit (fires on page unload/reload) ──────────────────────────────
app.post('/api/submit-beacon', (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const token = body?.token;
    if (!token) return res.status(400).end();
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).end(); }
    const session = activeSessions.get(token);
    if (!session) return res.status(200).end();
    const rollNo = decoded.rollNo;
    if (submittedExams.has(rollNo)) return res.status(200).end();
    autoSubmitStudent(rollNo, session, token);
    res.status(200).end();
  } catch {
    res.status(200).end();
  }
});

// ─── Serve Frontend ───────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛡️  BlueTeam Exam Server running on port ${PORT}`);
  console.log(`👥  ${students.length} students loaded | 📝  150 questions loaded\n`);
});