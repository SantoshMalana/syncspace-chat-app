import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MeetingProvider } from './context/MeetingContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardWrapper from './pages/DashboardWrapper'; // ✅ FIXED: was Dashboard
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';

function App() {
  return (
    <BrowserRouter>
      <MeetingProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/dashboard" element={<DashboardWrapper />} /> {/* ✅ FIXED */}
        </Routes>
      </MeetingProvider>
    </BrowserRouter>
  );
}

export default App;
