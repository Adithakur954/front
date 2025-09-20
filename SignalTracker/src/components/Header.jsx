import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 flex-shrink-0">
       <div>
        {/* Can be used for breadcrumbs or page titles later */}
      </div>
      <div className="flex items-center space-x-4">
        <p className="text-gray-600 text-sm">
          Welcome, <span className="font-semibold">{user?.name || 'Amit Sethi'}</span>
        </p>
        <Button onClick={logout} variant="default" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}
