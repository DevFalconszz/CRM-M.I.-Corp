import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ClipboardList, Radar, BarChart3, Gauge, FolderLock, KeyRound, LogOut, X, Sun, Moon } from 'lucide-react';
import { isLocal } from '@/lib/env-check';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

interface Tab {
  to: string;
  label: string;
  icon: typeof ClipboardList;
  roles?: Array<'admin' | 'tm'>;
}

const tabs: Tab[] = [
  { to: '/', label: 'Gestão de Leads', icon: ClipboardList, roles: ['admin', 'sdr'] },
  { to: '/prospectar', label: 'Prospectar', icon: Radar, roles: ['admin', 'sdr'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
  { to: '/documentos', label: 'Documentos', icon: FolderLock, roles: ['admin'] },
  { to: '/tm', label: 'Gestor de Tráfego', icon: Gauge, roles: ['admin', 'tm'] },
];

export function AppHeader() {
  const location = useLocation();
  const { signOut, user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [pwOpen, setPwOpen] = useState(false);

  const visibleTabs = tabs.filter((tab) => !tab.roles || (role && tab.roles.includes(role)));

  return (
    <header className="border-b border-border bg-card text-foreground sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-3 md:px-4">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 py-2 md:py-0 md:h-14">
          <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-3">
            <span className="text-lg font-bold text-gold-500 shrink-0 flex items-center gap-2">
              <img src="/logo.png" alt="CRM MI" className="h-9 w-9 object-cover rounded-full" />
              CRM MI
            </span>
            {isLocal() && (
              <span className="text-[10px] font-mono bg-gold-500/20 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30">
                LOCAL
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPwOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
            >
              <KeyRound className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 -mr-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="ml-1">Sair</span>
            </Button>
          </div>
          <nav className="flex gap-1 md:ml-auto mt-2 md:mt-0 overflow-x-auto">
            {visibleTabs.map(tab => {
              const active = location.pathname === tab.to;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-gold-500 text-black'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPwOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
              title="Alterar senha"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden xl:inline ml-1">Alterar senha</span>
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
              {user?.user_metadata?.full_name || user?.email || ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </div>
        </div>
      </div>

      {pwOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPwOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card text-foreground shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Alterar senha</h3>
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ChangePasswordForm onSuccess={() => setPwOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
