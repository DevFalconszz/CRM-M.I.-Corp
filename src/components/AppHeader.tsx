import { NavLink, useLocation, Link } from 'react-router-dom';
import { Radar, BarChart3, Gauge, FolderLock, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { isLocal } from '@/lib/env-check';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/avatars';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

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
  const [open, setOpen] = useState(false);

  const visibleTabs = tabs.filter((tab) => !tab.roles || (role && tab.roles.includes(role)));
  const displayName = (user?.user_metadata?.full_name as string) || user?.email || '';
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || '';

  return (
    <header className="border-b border-border bg-card text-foreground sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between py-2 h-14">
          <div className="flex items-center gap-3">
            <span className="text-base sm:text-lg font-bold text-gold-500 shrink-0 flex items-center gap-2">
              <img src="/logo.png" alt="CRM MI" className="h-8 w-8 sm:h-9 sm:w-9 object-cover rounded-full" />
              CRM MI
            </span>
            {isLocal() && (
              <span className="text-[9px] sm:text-[10px] font-mono bg-gold-500/20 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30">
                LOCAL
              </span>
            )}
          </div>

          {/* Navegação desktop */}
          <nav className="hidden md:flex gap-1 md:ml-auto">
            {visibleTabs.map((tab) => {
              const active = location.pathname === tab.to;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-gold-500 text-black' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden sr-only">{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Ações desktop */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 ml-2 pl-2 lg:pl-4 border-l border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-2 lg:px-3"
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-2 lg:px-3"
              title="Meu perfil"
            >
              <Link to="/perfil" className="flex items-center gap-2">
                <Avatar className="h-7 w-7 lg:h-8 lg:w-8 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-gold-500 text-black text-[10px] lg:text-xs font-bold">
                    {initials(displayName) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:inline text-xs text-muted-foreground max-w-[140px] truncate">
                  {displayName}
                </span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-2 lg:px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline ml-1">Sair</span>
            </Button>
          </div>

          {/* Menu mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 p-0"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[360px] p-0 flex flex-col">
              <SheetHeader className="px-6 py-4 border-b border-border">
                <SheetTitle className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gold-500 flex items-center gap-2">
                    <img src="/logo.png" alt="CRM MI" className="h-8 w-8 object-cover rounded-full" />
                    CRM MI
                  </span>
                </SheetTitle>
              </SheetHeader>

              {/* Perfil mobile */}
              <div className="px-6 py-4 border-b border-border">
                <Link to="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                    <AvatarFallback className="bg-gold-500 text-black text-sm font-bold">
                      {initials(displayName) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName || 'Meu perfil'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </Link>
              </div>

              {/* Links de navegação */}
              <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto custom-scrollbar">
                {visibleTabs.map((tab) => {
                  const active = location.pathname === tab.to;
                  return (
                    <NavLink
                      key={tab.to}
                      to={tab.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-gold-500 text-black shadow-sm'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </NavLink>
                  );
                })}
              </nav>

              {/* Ações mobile (rodapé) */}
              <div className="border-t border-border px-4 py-3 space-y-1">
                <button
                  onClick={() => {
                    toggleTheme();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
