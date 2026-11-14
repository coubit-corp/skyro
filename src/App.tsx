import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  Heart,
  History,
  House,
  MessageSquare,
  User,
  Users,
} from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/auth-context'
import { homeFor } from './auth/home'
import { RequireProProfile } from './auth/RequireProProfile'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './components/AppLayout'
import type { NavItem } from './components/BottomNav'
import { FullScreenLoader } from './components/FullScreenLoader'
import { supabaseConfigured } from './lib/supabase'
import { ComingSoon } from './pages/ComingSoon'
import { ConfigMissing } from './pages/ConfigMissing'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

// Cada tela é baixada só quando é aberta: o celular não precisa carregar o
// painel do profissional (nem o mapa) para mostrar o Início da pessoa.
const Inicio = lazy(() => import('./pages/pessoa/Inicio').then((m) => ({ default: m.Inicio })))
const PerfilProfissional = lazy(() =>
  import('./pages/pessoa/PerfilProfissional').then((m) => ({ default: m.PerfilProfissional })),
)
const PertoDeVoce = lazy(() => import('./pages/pessoa/PertoDeVoce').then((m) => ({ default: m.PertoDeVoce })))
const Perfil = lazy(() => import('./pages/pessoa/Perfil').then((m) => ({ default: m.Perfil })))
const Plano = lazy(() => import('./pages/pessoa/Plano').then((m) => ({ default: m.Plano })))
const Rotina = lazy(() => import('./pages/pessoa/Rotina').then((m) => ({ default: m.Rotina })))
const Saude = lazy(() => import('./pages/pessoa/Saude').then((m) => ({ default: m.Saude })))
const Paciente = lazy(() => import('./pages/profissional/Paciente').then((m) => ({ default: m.Paciente })))
const CompletarPerfil = lazy(() =>
  import('./pages/profissional/CompletarPerfil').then((m) => ({ default: m.CompletarPerfil })),
)
const MeuPerfil = lazy(() => import('./pages/profissional/MeuPerfil').then((m) => ({ default: m.MeuPerfil })))
const Pacientes = lazy(() => import('./pages/profissional/Pacientes').then((m) => ({ default: m.Pacientes })))
const Registros = lazy(() => import('./pages/equipe/Registros').then((m) => ({ default: m.Registros })))

// Mesma ordem de abas dos mockups.
const PERSON_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/saude', label: 'Saúde', icon: Heart },
  { to: '/plano', label: 'Plano', icon: ClipboardList },
  { to: '/rotina', label: 'Rotina', icon: CalendarDays },
  { to: '/progresso', label: 'Progresso', icon: ChartNoAxesColumn },
]

const PRO_NAV: NavItem[] = [
  { to: '/pro', label: 'Pacientes', icon: Users, end: true, alsoActiveOn: ['/pro/pacientes'] },
  { to: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pro/mensagens', label: 'Mensagens', icon: MessageSquare },
  { to: '/pro/perfil', label: 'Perfil', icon: User },
]

// Equipe Skyro: só quem tem papel admin (dado por SQL).
const TEAM_NAV: NavItem[] = [
  { to: '/equipe', label: 'Pendentes', icon: BadgeCheck, end: true },
  { to: '/equipe/decididos', label: 'Decididos', icon: History },
]

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/entrar" element={<Login />} />

              {/* App da pessoa */}
              <Route
                element={
                  <RequireRole role="person">
                    <AppLayout nav={PERSON_NAV} profileTo="/perfil" />
                  </RequireRole>
                }
              >
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/saude" element={<Saude />} />
                <Route path="/saude/perto" element={<PertoDeVoce />} />
                <Route path="/saude/profissional/:id" element={<PerfilProfissional />} />
                <Route path="/rotina" element={<Rotina />} />
                <Route path="/plano" element={<Plano />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/progresso" element={<ComingSoon title="Seu progresso" />} />
              </Route>

              {/* App do profissional */}
              <Route
                element={
                  <RequireRole role="professional">
                    <RequireProProfile>
                      <AppLayout nav={PRO_NAV} wide />
                    </RequireProProfile>
                  </RequireRole>
                }
              >
                <Route path="/pro" element={<Pacientes />} />
                <Route path="/pro/pacientes/:id" element={<Paciente />} />
                <Route path="/pro/agenda" element={<ComingSoon title="Agenda" />} />
                <Route path="/pro/mensagens" element={<ComingSoon title="Mensagens" />} />
                <Route path="/pro/perfil" element={<MeuPerfil />} />
              </Route>

              {/* Área da equipe: aprovar ou recusar registros de conselho */}
              <Route
                element={
                  <RequireRole role="admin">
                    <AppLayout nav={TEAM_NAV} wide />
                  </RequireRole>
                }
              >
                <Route path="/equipe" element={<Registros view="pendentes" />} />
                <Route path="/equipe/decididos" element={<Registros view="decididos" />} />
              </Route>

              {/* Fora do painel: quem ainda não tem perfil profissional completo */}
              <Route
                path="/pro/completar-perfil"
                element={
                  <RequireRole role="professional">
                    <CompletarPerfil />
                  </RequireRole>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
