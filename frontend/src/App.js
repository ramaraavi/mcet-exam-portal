import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Instructions from './pages/Instructions';
import Exam from './pages/Exam';
import Result from './pages/Result';
import './App.css';

function App() {
  const [phase, setPhase] = useState('login');
  const [authData, setAuthData] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    const noRightClick = (e) => e.preventDefault();
    document.addEventListener('contextmenu', noRightClick);
    document.onselectstart = () => false;

    const devToolsCheck = setInterval(() => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        console.clear();
      }
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', noRightClick);
      clearInterval(devToolsCheck);
    };
  }, []);

  const handleLogin = (data) => {
    setAuthData(data);
    setPhase('instructions');
  };

  const handleStartExam = () => setPhase('exam');

  const handleSubmit = (data) => {
    setResultData(data);
    setPhase('result');
  };

  return (
    <div className="app">
      {phase === 'login' && <Login onLogin={handleLogin} />}
      {phase === 'instructions' && <Instructions authData={authData} onStart={handleStartExam} />}
      {phase === 'exam' && <Exam authData={authData} onSubmit={handleSubmit} />}
      {phase === 'result' && <Result data={resultData} student={authData?.student} />}
    </div>
  );
}

export default App;