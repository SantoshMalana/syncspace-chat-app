import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} /> {/* ⭐ ADD THIS */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;