import FabAuthLoginPage from '@/pages/Login';
import FabAuthSignupPage from '@/pages/Signup';
import FabAuthForgotPasswordPage from '@/pages/ForgotPassword';
import FabAuthResetPasswordPage from '@/pages/ResetPassword';
import FabAuthAcceptInvitePage from '@/pages/AcceptInvite';
import FabAuthChangePasswordPage from '@/pages/ChangePassword';
import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Mapa from '@/pages/Mapa';
import Academia from '@/pages/Academia';
import Marca from '@/pages/Marca';
import Comunidade from '@/pages/Comunidade';
import Mais from '@/pages/Mais';
import CalendarioAvisos from '@/pages/CalendarioAvisos';
import DevelopmentPlan from '@/pages/DevelopmentPlan';
import Diagnostico from '@/pages/Diagnostico';
import Layout from '@/components/Layout';
import { RequireAuth } from '@/lib/fab-client';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<FabAuthLoginPage />} />
      <Route path="/signup" element={<FabAuthSignupPage />} />
      <Route path="/forgot-password" element={<FabAuthForgotPasswordPage />} />
      <Route path="/reset-password" element={<FabAuthResetPasswordPage />} />
      <Route path="/accept-invite" element={<FabAuthAcceptInvitePage />} />
      <Route path="/change-password" element={<FabAuthChangePasswordPage />} />
      <Route path="/" element={<Home />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/jornada" element={<Home />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/academia" element={<Academia />} />
          <Route path="/marca" element={<Marca />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/mais" element={<Mais />} />
          <Route path="/calendario" element={<CalendarioAvisos />} />
          <Route path="/plano" element={<DevelopmentPlan />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
        </Route>
      </Route>
    </Routes>
  );
}
