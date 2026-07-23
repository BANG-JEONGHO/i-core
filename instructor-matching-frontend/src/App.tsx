import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import InstructorsPage from './pages/InstructorsPage';
import TaskOrderUploadPage from './pages/TaskOrderUploadPage';
import MatchingResultPage from './pages/MatchingResultPage';
import TaskOrderDetailPage from './pages/TaskOrderDetailPage';
import MatchingHistoryPage from './pages/MatchingHistoryPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/instructors" element={<InstructorsPage />} />
            <Route path="/task-orders/upload" element={<TaskOrderUploadPage />} />
            <Route path="/task-orders/:id" element={<TaskOrderDetailPage />} />
            <Route path="/matching-history" element={<MatchingHistoryPage />} />
            <Route path="/matching/:id" element={<MatchingResultPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px', borderRadius: '8px' }, duration: 3000 }} />
    </QueryClientProvider>
  );
}
