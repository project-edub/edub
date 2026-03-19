import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AccountManagementPage from './pages/admin/AccountManagementPage';
import SubscriptionPackagePage from './pages/admin/SubscriptionPackagePage';
import OverviewPage from './pages/lecturer/OverviewPage';
import ClassListPage from './pages/lecturer/ClassListPage';
import ClassDetailPage from './pages/lecturer/ClassDetailPage';
import LessonPlanPage from './pages/lecturer/LessonPlanPage';
import TeachingMaterialStoragePage from './pages/lecturer/TeachingMaterialStoragePage';
import AdminRoute from './components/common/AdminRoute';
import LecturerRoute from './components/common/LecturerRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/accounts" element={<AccountManagementPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionPackagePage />} />
        </Route>

        {/* Lecturer routes */}
        <Route element={<LecturerRoute />}>
          <Route path="/lecturer/overview" element={<OverviewPage />} />
          <Route path="/lecturer/classes" element={<ClassListPage />} />
          <Route path="/lecturer/classes/:id" element={<ClassDetailPage />} />
          <Route path="/lecturer/lesson-plans" element={<LessonPlanPage />} />
          <Route path="/lecturer/storage" element={<TeachingMaterialStoragePage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
