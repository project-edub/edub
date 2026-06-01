import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage';
import AccountManagementPage from './pages/admin/AccountManagementPage';
import SubscriptionPackagePage from './pages/admin/SubscriptionPackagePage';
import CoinPackagePage from './pages/admin/CoinPackagePage';
import OverviewPage from './pages/lecturer/OverviewPage';
import ClassListPage from './pages/lecturer/ClassListPage';
import ClassDetailPage from './pages/lecturer/ClassDetailPage';
import LessonPlanPage from './pages/lecturer/LessonPlanPage';
import MinigamesPage from './pages/lecturer/MinigamesPage';
import TeachingMaterialStoragePage from './pages/lecturer/TeachingMaterialStoragePage';
import QuizGeneratorPage from './pages/lecturer/QuizGeneratorPage';
import CoinPurchasePage from './pages/lecturer/CoinPurchasePage';
import AdminRoute from './components/common/AdminRoute';
import LecturerRoute from './components/common/LecturerRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />

        {/* Auth routes (public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/accounts" element={<AccountManagementPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionPackagePage />} />
          <Route path="/admin/coin-packages" element={<CoinPackagePage />} />
        </Route>

        {/* Lecturer routes */}
        <Route element={<LecturerRoute />}>
          <Route path="/lecturer/overview" element={<OverviewPage />} />
          <Route path="/lecturer/classes" element={<ClassListPage />} />
          <Route path="/lecturer/classes/:id" element={<ClassDetailPage />} />
          <Route path="/lecturer/lesson-plans" element={<LessonPlanPage />} />
          <Route path="/minigames" element={<MinigamesPage />} />
          <Route path="/lecturer/storage" element={<TeachingMaterialStoragePage />} />
          <Route path="/lecturer/quiz-generator" element={<QuizGeneratorPage />} />
          <Route path="/lecturer/coin-packages" element={<CoinPurchasePage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
