import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage';
import AccountManagementPage from './pages/admin/AccountManagementPage';
import SubscriptionPackagePage from './pages/admin/SubscriptionPackagePage';
import CoinPackagePage from './pages/admin/CoinPackagePage';
import ScoreTemplateManager from './pages/admin/ScoreTemplateManager';
import GameEcoinConfigPage from './pages/admin/GameEcoinConfigPage';
import OverviewPage from './pages/lecturer/OverviewPage';
import ClassListPage from './pages/lecturer/ClassListPage';
import ClassDetailPage from './pages/lecturer/ClassDetailPage';
import LessonPlanPage from './pages/lecturer/LessonPlanPage';
import TeachingMaterialStoragePage from './pages/lecturer/TeachingMaterialStoragePage';
import QuizGeneratorPage from './pages/lecturer/QuizGeneratorPage';
import QuizListPage from './pages/lecturer/QuizListPage';
import QuizEditorPage from './pages/lecturer/QuizEditorPage';
import CoinPurchasePage from './pages/lecturer/CoinPurchasePage';
import SubscriptionPage from './pages/lecturer/SubscriptionPage';
import TransactionHistoryPage from './pages/lecturer/TransactionHistoryPage';
import CrosswordListPage from './pages/lecturer/CrosswordListPage';
import CrosswordCreatorPage from './pages/lecturer/CrosswordCreatorPage';
import CrosswordEditorPage from './pages/lecturer/CrosswordEditorPage';
import CrosswordPlayerPage from './pages/CrosswordPlayerPage';
import QuizPlayerPage from './pages/QuizPlayerPage';
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

        {/* Public crossword player route */}
        <Route path="/play/:slug" element={<CrosswordPlayerPage />} />
        <Route path="/quiz/:slug" element={<QuizPlayerPage />} />

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/accounts" element={<AccountManagementPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionPackagePage />} />
          <Route path="/admin/coin-packages" element={<CoinPackagePage />} />
          <Route path="/admin/score-templates" element={<ScoreTemplateManager />} />
          <Route path="/admin/game-ecoin-config" element={<GameEcoinConfigPage />} />
        </Route>

        {/* Lecturer routes */}
        <Route element={<LecturerRoute />}>
          <Route path="/lecturer/overview" element={<OverviewPage />} />
          <Route path="/lecturer/classes" element={<ClassListPage />} />
          <Route path="/lecturer/classes/:id" element={<ClassDetailPage />} />
          <Route path="/lecturer/lesson-plans" element={<LessonPlanPage />} />
          <Route path="/lecturer/storage" element={<TeachingMaterialStoragePage />} />
          <Route path="/lecturer/quiz-generator" element={<QuizListPage />} />
          <Route path="/lecturer/quiz/new" element={<QuizGeneratorPage />} />
          <Route path="/lecturer/quiz/:id/edit" element={<QuizEditorPage />} />
          <Route path="/lecturer/coin-packages" element={<CoinPurchasePage />} />
          <Route path="/lecturer/subscription" element={<SubscriptionPage />} />
          <Route path="/lecturer/transactions" element={<TransactionHistoryPage />} />
          <Route path="/lecturer/crossword" element={<CrosswordListPage />} />
          <Route path="/lecturer/crossword/new" element={<CrosswordCreatorPage />} />
          <Route path="/lecturer/crossword/:id/edit" element={<CrosswordEditorPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
