import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, History, Map, Settings, Users, FolderGit2 } from 'lucide-react';
import VinfocomLogo from '../assets/vinfocom_logo.png';

const SideBar = ({ collapsed }) => {
  const navLinks = [
    { icon: LayoutDashboard, text: 'Dashboard', path: '/dashboard' },
    { icon: Upload, text: 'Upload Data', path: '/upload-data' },
    { icon: History, text: 'Drive Test Sessions', path: '/drive-test-sessions' },
    { icon: Map, text: 'Map View', path: '/map-view' },
    { icon: FolderGit2, text: 'Manage Session', path: '/manage-session' },
    { icon: Users, text: 'Manage User', path: '/manage-users' },
    { icon: Settings, text: 'Setting', path: '/settings' },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 text-white flex flex-col shadow-lg transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-center border-b border-gray-700">
        <img src={VinfocomLogo} alt="Vinfocom Logo" className="h-10" />
        {!collapsed && <span className="ml-2 font-bold">Vinfocom</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul>
          {navLinks.map((link, index) => (
            <li key={index} className="mb-2">
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                <link.icon className="h-5 w-5" />
                {!collapsed && <span className="ml-3 font-medium">{link.text}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SideBar;
