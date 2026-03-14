const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

const students = require('./db/students');
const questions = require('./db/questions');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'blueteam_exam_2025_ultra_secret_key_xK9mP3nQ';
const EXAM_DURATION = 150 * 60;

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

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/api/login', loginLimiter, (req, res) => {
  const { rollNo, password } = req.body;
  if (!rollNo || !password) return res.status(400).json({ error: 'Roll number and password required' });
  const student = students.find(s => s.roll_no === rollNo.trim().toUpperCase());
  if (!student) return res.status(401).json({ error: 'Invalid credentials' });
  const validPass = bcrypt.compareSync(password, student.password_hash);
  if (!validPass) return res.status(401).json({ error: 'Invalid credentials' });
  if (submittedExams.has(rollNo)) return res.status(403).json({ error: 'Exam already submitted. You cannot re-enter.' });
  const existingToken = sessionTokens.get(rollNo);
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
  sessionTokens.set(rollNo, token);
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
  res.json({
    answers: req.session.answers,
    markedForReview: req.session.markedForReview,
    startTime: req.session.startTime,
    tabSwitches: req.session.tabSwitches,
    serverTime: Date.now()
  });
});

app.post('/api/log-tabswitch', authenticate, (req, res) => {
  req.session.tabSwitches++;
  res.json({ tabSwitches: req.session.tabSwitches });
});

app.post('/api/submit', authenticate, (req, res) => {
  const { rollNo } = req.student;
  if (submittedExams.has(rollNo)) return res.status(400).json({ error: 'Already submitted' });
  const shuffled = getShuffledQuestions(rollNo);
  const answers = req.session.answers;
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
    rollNo, name: req.session.name, answers, totalCorrect, totalAttempted,
    totalQuestions: 150, sectionScores, tabSwitches: req.session.tabSwitches,
    submittedAt: new Date().toISOString(),
    timeTaken: Math.floor((Date.now() - req.session.startTime) / 1000)
  };
  submittedExams.set(rollNo, result);
  activeSessions.delete(req.token);
  sessionTokens.delete(rollNo);
  res.json({ message: 'Exam submitted successfully', score: totalCorrect, totalAttempted, sectionScores });
});

app.get('/api/admin/results', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_KEY || 'admin_blueteam_2025')) return res.status(403).json({ error: 'Forbidden' });
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

app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛡️  BlueTeam Exam Server running on port ${PORT}`);
  console.log(`👥  60 students loaded | 📝  150 questions loaded\n`);
});