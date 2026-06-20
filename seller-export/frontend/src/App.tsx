import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SellersPage from './pages/SellersPage';
import NewSellerPage from './pages/NewSellerPage';
import SellerDetailPage from './pages/SellerDetailPage';
import CallModePage from './pages/CallModePage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SettingsPage from './pages/SettingsPage';
import { PhoneSettingsPage } from './pages/PhoneSettingsPage';
import { CallHistoryPage } from './pages/CallHistoryPage';
import { CallStatisticsPage } from './pages/CallStatisticsPage';
import EmployeeCalendarStatusPage from './pages/EmployeeCalendarStatusPage';
import WorkTasksPage from './pages/WorkTasksPage';
import PropertyListingsPage from './pages/PropertyListingsPage';
import PropertyListingDetailPage from './pages/PropertyListingDetailPage';
import BuyersPage from './pages/BuyersPage';
import NewBuyerPage from './pages/NewBuyerPage';
import BuyerDetailPage from './pages/BuyerDetailPage';
import PublicPropertyListingPage from './pages/PublicPropertyListingPage';
import PublicPropertiesPage from './pages/PublicPropertiesPage';
import PublicPropertyDetailPage from './pages/PublicPropertyDetailPage';
import { PropertyListingSyncDashboard } from './pages/PropertyListingSyncDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  
  // アプリ起動時に認証状態を確認
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return (
    <GoogleMapsProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        {/* Public routes - no authentication required */}
        <Route path="/public/properties" element={<PublicPropertiesPage />} />
        <Route path="/public/properties/:id" element={<PublicPropertyDetailPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SellersPage />
            </ProtectedRoute>
          }
        />
      <Route
        path="/sellers/new"
        element={
          <ProtectedRoute>
            <NewSellerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sellers/:id"
        element={
          <ProtectedRoute>
            <SellerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sellers/:id/call"
        element={
          <ProtectedRoute>
            <CallModePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-logs"
        element={
          <ProtectedRoute>
            <ActivityLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/phone"
        element={
          <ProtectedRoute>
            <PhoneSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calls/history"
        element={
          <ProtectedRoute>
            <CallHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calls/statistics"
        element={
          <ProtectedRoute>
            <CallStatisticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/calendar-status"
        element={
          <ProtectedRoute>
            <EmployeeCalendarStatusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-tasks"
        element={
          <ProtectedRoute>
            <WorkTasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-listings"
        element={
          <ProtectedRoute>
            <PropertyListingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-listings/:propertyNumber"
        element={
          <ProtectedRoute>
            <PropertyListingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-listings/sync/dashboard"
        element={
          <ProtectedRoute>
            <PropertyListingSyncDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyers"
        element={
          <ProtectedRoute>
            <BuyersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyers/new"
        element={
          <ProtectedRoute>
            <NewBuyerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyers/:buyer_number"
        element={
          <ProtectedRoute>
            <BuyerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </GoogleMapsProvider>
  );
}

export default App;
