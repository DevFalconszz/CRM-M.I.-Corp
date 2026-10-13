import { NavLink, useLocation, Link } from 'react-router-dom';
import { Radar, BarChart3, Gauge, FolderLock, Sun, Moon, LogOut } from 'lucide-react';
import { isLocal } from '@/lib/env-check';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/avatars';

interface Tab {
  to: string;
  label: string;
  icon: typeof Radar;
  roles?: Array<'admin' | 'tm'>;
}

const tabs: Tab[] = [
  { to: '/', label: 'Gestão de Leads', icon: Radar, roles: ['admin', 'sdr'] },
  { to: '/prospectar', label: 'Prospectar', icon: Radar, roles: ['admin', 'sdr'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
  { to: '/documentos', label: 'Documentos', icon: FolderLock, roles: ['admin'] },
  { to: '/tm', label: 'Gestor de Tráfego', icon: Gauge, roles: ['admin', 'tm'] },
];

export function AppHeader() {
  const location = useLocation();
  const { signOut, user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const visibleTabs = tabs.filter((tab) => !tab.roles || (role && tab.roles.includes(role)));
  const displayName = (user?.user_metadata?.full_name as string) || user?.email || '';
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || '';

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
              asChild
              variant="ghost"
              size="sm"
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
              title="Meu perfil"
            >
              <Link to="/perfil">
                <Avatar className="h-7 w-7 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-gold-500 text-black text-xs font-bold">
                    {initials(displayName) || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
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
          <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-border">
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
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3"
              title="Meu perfil"
            >
              <Link to="/perfil" className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-gold-500 text-black text-xs font-bold">
                    {initials(displayName) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-xs text-muted-foreground max-w-[160px] truncate">
                  {displayName}
                </span>
              </Link>
            </Button>
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
    </header>
  );
}