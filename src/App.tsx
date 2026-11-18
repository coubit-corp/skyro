import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  Heart,
  History,
  House,
  MessageSquare,
  Settings,
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
import { Configuracoes } from './pages/Configuracoes'
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
const Plano = lazy(() => import('./pages/pessoa/Plano').then((m) => ({ default: m.Plano })))
const Progresso = lazy(() => import('./pages/pessoa/Progresso').then((m) => ({ default: m.Progresso })))
const ResumoSemana = lazy(() => import('./pages/pessoa/ResumoSemana').then((m) => ({ default: m.ResumoSemana })))
const Rotina = lazy(() => import('./pages/pessoa/Rotina').then((m) => ({ default: m.Rotina })))
const Saude = lazy(() => import('./pages/pessoa/Saude').then((m) => ({ default: m.Saude })))
const Paciente = lazy(() => import('./pages/profissional/Paciente').then((m) => ({ default: m.Paciente })))
const MensagensPro = lazy(() => import('./pages/profissional/Mensagens').then((m) => ({ default: m.Mensagens })))
const MensagensPessoa = lazy(() => import('./pages/pessoa/Mensagens').then((m) => ({ default: m.Mensagens })))
const CompletarPerfil = lazy(() =>
  import('./pages/profissional/CompletarPerfil').then((m) => ({ default: m.CompletarPerfil })),
)
const Pacientes = lazy(() => import('./pages/profissional/Pacientes').then((m) => ({ default: m.Pacientes })))
const Registros = lazy(() => import('./pages/equipe/Registros').then((m) => ({ default: m.Registros })))

// Mesma ordem de abas dos mockups.
const PERSON_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/saude', label: 'Saúde', icon: Heart },
  { to: '/plano', label: 'Plano', icon: ClipboardList },
  { to: '/rotina', label: 'Rotina', icon: CalendarDays },
  { to: '/progresso', label: 'Progresso', icon: ChartNoAxesColumn },
  // "Meu perfil" fica dentro de Configurações. No celular, abre pela engrenagem
  // ou pelo avatar no topo do Início (como nos mockups, são 5 abas).
  { to: '/configuracoes', label: 'Configurações', icon: Settings, desktopOnly: true },
]

const PRO_NAV: NavItem[] = [
  { to: '/pro', label: 'Pacientes', icon: Users, end: true, alsoActiveOn: ['/pro/pacientes'] },
  { to: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pro/mensagens', label: 'Mensagens', icon: MessageSquare },
  // O perfil (dados, fotos e vídeos, avaliações) fica dentro de Configurações.
  { to: '/pro/configuracoes', label: 'Ajustes', icon: Settings },
]

// Equipe Skyro: só quem tem papel admin (dado por SQL).
const TEAM_NAV: NavItem[] = [
  { to: '/equipe', label: 'Pendentes', icon: BadgeCheck, end: true },
  { to: '/equipe/decididos', label: 'Decididos', icon: History },
  { to: '/equipe/configuracoes', label: 'Configurações', icon: Settings },
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
                    <AppLayout nav={PERSON_NAV} />
                  </RequireRole>
                }
              >
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/saude" element={<Saude />} />
                <Route path="/saude/perto" element={<PertoDeVoce />} />
                <Route path="/saude/profissional/:id" element={<PerfilProfissional />} />
                <Route path="/saude/mensagens" element={<MensagensPessoa />} />
                <Route path="/saude/mensagens/:proId" element={<MensagensPessoa />} />
                <Route path="/rotina" element={<Rotina />} />
                <Route path="/plano" element={<Plano />} />
                <Route path="/perfil" element={<Navigate to="/configuracoes" replace />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/progresso" element={<Progresso />} />
                <Route path="/progresso/semana" element={<ResumoSemana />} />
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
                <Route path="/pro/mensagens" element={<MensagensPro />} />
                <Route path="/pro/mensagens/:personId" element={<MensagensPro />} />
                <Route path="/pro/perfil" element={<Navigate to="/pro/configuracoes" replace />} />
                <Route path="/pro/perfil/galeria" element={<Navigate to="/pro/configuracoes/galeria" replace />} />
                <Route path="/pro/configuracoes" element={<Configuracoes />} />
                <Route path="/pro/configuracoes/galeria" element={<Configuracoes />} />
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
                <Route path="/equipe/configuracoes" element={<Configuracoes />} />
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
