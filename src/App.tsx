import { CalendarDays, ChartNoAxesColumn, ClipboardList, Heart, House, MessageSquare, User, Users } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/auth-context'
import { homeFor } from './auth/home'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './components/AppLayout'
import type { NavItem } from './components/BottomNav'
import { FullScreenLoader } from './components/FullScreenLoader'
import { supabaseConfigured } from './lib/supabase'
import { ComingSoon } from './pages/ComingSoon'
import { ConfigMissing } from './pages/ConfigMissing'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Inicio } from './pages/pessoa/Inicio'
import { PerfilProfissional } from './pages/pessoa/PerfilProfissional'
import { PertoDeVoce } from './pages/pessoa/PertoDeVoce'
import { Rotina } from './pages/pessoa/Rotina'
import { Paciente } from './pages/profissional/Paciente'
import { Pacientes } from './pages/profissional/Pacientes'

// Mesma ordem de abas dos mockups.
const PERSON_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/saude', label: 'Saúde', icon: Heart },
  { to: '/plano', label: 'Plano', icon: ClipboardList },
  { to: '/rotina', label: 'Rotina', icon: CalendarDays },
  { to: '/progresso', label: 'Progresso', icon: ChartNoAxesColumn },
]

const PRO_NAV: NavItem[] = [
  { to: '/pro', label: 'Pacientes', icon: Users },
  { to: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pro/mensagens', label: 'Mensagens', icon: MessageSquare },
  { to: '/pro/perfil', label: 'Perfil', icon: User },
]

/** "/" manda cada um para a sua home (ou para o login). */
function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/entrar" replace />
  return <Navigate to={profile ? homeFor(profile.role) : '/entrar'} replace />
}

export default function App() {
  if (!supabaseConfigured) return <ConfigMissing />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/entrar" element={<Login />} />

          {/* App da pessoa */}
          <Route
            element={
              <RequireRole role="person">
                <AppLayout nav={PERSON_NAV} />
              </RequireRole>
            }
          >
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/saude" element={<PertoDeVoce />} />
            <Route path="/saude/profissional/:id" element={<PerfilProfissional />} />
            <Route path="/rotina" element={<Rotina />} />
            <Route path="/plano" element={<ComingSoon title="Meu plano" />} />
            <Route path="/progresso" element={<ComingSoon title="Seu progresso" />} />
          </Route>

          {/* App do profissional */}
          <Route
            element={
              <RequireRole role="professional">
                <AppLayout nav={PRO_NAV} wide />
              </RequireRole>
            }
          >
            <Route path="/pro" element={<Pacientes />} />
            <Route path="/pro/pacientes/:id" element={<Paciente />} />
            <Route path="/pro/agenda" element={<ComingSoon title="Agenda" />} />
            <Route path="/pro/mensagens" element={<ComingSoon title="Mensagens" />} />
            <Route path="/pro/perfil" element={<ComingSoon title="Meu perfil" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
