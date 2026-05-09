import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, Users, Moon, Sun, LogOut 
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/pacientes', label: 'Pacientes', icon: Users },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        {/* Placeholder for the generated logo - assuming it will be in assets or we use a data URI/file path */}
        <div style={{ background: 'rgba(255,255,255,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
             <path d="M12 5c.5 3.5 2 5 2 5" />
           </svg>
        </div>
        <h1 className="logo-text">Fortes<span>Nutri</span></h1>
      </div>

      <ul className="nav-links">
        {menuItems.map((item) => (
          <li 
            key={item.path}
            className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="nav-item" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </div>
        <div className="nav-item logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Sair</span>
        </div>
      </div>
    </aside>
  );
}
