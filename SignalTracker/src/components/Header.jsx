import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeSwitch = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-18 bg-white dark:bg-gray-800 dark:border-b dark:border-gray-700 shadow-sm flex items-center justify-between px-8 flex-shrink-0">
      <div>
        {/* Can be used for breadcrumbs or page titles later */}
      </div>
      <div className="flex items-center space-x-4">
        {/* --- THEME TOGGLE BUTTON --- */}
        <Button 
          onClick={handleThemeSwitch} 
          variant="ghost" 
          size="icon" 
          aria-label="Toggle theme"
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Welcome, <span className="font-semibold">{user?.name || 'Amit Sethi'}</span>
        </p>
        
        {/* This button's text is already white due to the 'default' variant */}
        <Button onClick={logout} variant="default" size="sm" className="text-white">
          <LogOut className="h-4 w-4 mr-2 text-white" />
          Logout
        </Button>
      </div>
    </header>
  );
}