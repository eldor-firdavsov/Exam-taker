import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import StudentHome from './pages/StudentHome'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveDashboard from './pages/LiveDashboard'
import ExamAdmin from './pages/ExamAdmin'
import ExamPublic from './pages/ExamPublic'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/student" element={<StudentHome />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/live" element={<LiveDashboard />} />
              <Route path="/dashboard/exams/:examId" element={<ExamAdmin />} />
            </Route>
          </Route>
          <Route path="/exam/:token" element={<ExamPublic />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
