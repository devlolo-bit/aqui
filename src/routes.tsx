import FabAuthLoginPage from '@/pages/Login';
import FabAuthSignupPage from '@/pages/Signup';
import FabAuthForgotPasswordPage from '@/pages/ForgotPassword';
import FabAuthResetPasswordPage from '@/pages/ResetPassword';
import FabAuthAcceptInvitePage from '@/pages/AcceptInvite';
import FabAuthChangePasswordPage from '@/pages/ChangePassword';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import Mapa from '@/pages/Mapa';
import Desenvolver from '@/pages/Desenvolver';
import Premios from '@/pages/Premios';
import Construir from '@/pages/Construir';
import Comunidade from '@/pages/Comunidade';
import Mais from '@/pages/Mais';
import CalendarioAvisos from '@/pages/CalendarioAvisos';
import DevelopmentPlan from '@/pages/DevelopmentPlan';
import Diagnostico from '@/pages/Diagnostico';
import DiagnosticoResultado from '@/pages/DiagnosticoResultado';
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
      {/* A raiz é a porta pública. A Home da membro vive em /inicio, dentro do
       * Layout, com um único cabeçalho. Antes as duas rotas renderizavam a
       * mesma tela: uma sem navegação, a outra com dois cabeçalhos. */}
      <Route path="/" element={<Home />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/inicio" element={<Home />} />
          <Route path="/jornada" element={<Navigate to="/inicio" replace />} />
          <Route path="/mapa" element={<Mapa />} />
          {/* Academia e Autoliderança são abas do mesmo estágio, cada uma com
            * a sua rota: um link direto abre a aba certa. */}
          <Route path="/academia" element={<Desenvolver tab="academia" />} />
          <Route path="/autolideranca" element={<Desenvolver tab="autolideranca" />} />
          <Route path="/premios" element={<Premios />} />
          {/* Marca e Números são abas do estágio Construir, cada uma com a sua rota. */}
          <Route path="/marca" element={<Construir tab="marca" />} />
          <Route path="/numeros" element={<Construir tab="numeros" />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/mais" element={<Mais />} />
          <Route path="/calendario" element={<CalendarioAvisos />} />
          <Route path="/plano" element={<DevelopmentPlan />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/diagnostico/resultado" element={<DiagnosticoResultado />} />
        </Route>
      </Route>
    </Routes>
  );
}
