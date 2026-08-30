import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { UserAvatar } from '../ui/UserAvatar.jsx';
import { Logo } from '../ui/Logo.jsx';
import { Button } from '../ui/Button.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { notificationsApi } from '../../api/notifications.js';

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);
  useOutsideClick(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    let cancelled = false;
    notificationsApi.list({ unreadOnly: true, pageSize: 1 })
      .then((res) => { if (!cancelled) setUnreadCount(res.meta?.unreadCount ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <Logo size={28} />
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Link
          to="/notifications"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <UserAvatar user={user} size={28} className="text-xs" />
            <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.email}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.roles?.join(', ')}</p>
              </div>
              <div className="px-1 py-1">
                <Button
                  type="button"
                  role="menuitem"
                  variant="danger"
                  loading={loggingOut}
                  onClick={handleLogout}
                  className="w-full justify-start"
                >
                  <LogOut size={15} aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
