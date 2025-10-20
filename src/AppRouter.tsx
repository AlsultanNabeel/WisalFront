import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import InstitutionPage from './pages/Institution';
import DeliveryPage from './pages/Delivery';
import PostsPage from './pages/Posts';
import DistributerPage from './pages/Distributer';
import DistributionDetailsPage from './pages/DistributionDetails';
import RoundDetailsPage from './pages/RoundDetails';
import NotificationsPage from './pages/Notifications';
import EmployeesPage from './pages/Employees';
import BeneficiariesPage from './pages/Beneficiaries';
import BeneficiaryDetailsPage from './pages/BeneficiaryDetails';
import UnauthorizedPage from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/" element={<InstitutionPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/beneficiaries" element={<BeneficiariesPage />} />
        <Route path="/beneficiaries/:beneficiaryId" element={<BeneficiaryDetailsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DELIVERER']} />}>
        <Route path="/deliver" element={<DeliveryPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PUBLISHER']} />}>
        <Route path="/posts" element={<PostsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DISTRIBUTER']} />}>
        <Route path="/distribution" element={<DistributerPage />} />
        <Route path="/distribution/:distributionId" element={<DistributionDetailsPage />} />
        <Route
          path="/distribution/:distributionId/round/:roundId"
          element={<RoundDetailsPage />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
