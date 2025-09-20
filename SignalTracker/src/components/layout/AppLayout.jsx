import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../Header';
import SideBar from '../SideBar';

const AppLayout = ({ children }) => {
  const { pathname } = useLocation();
  const isMapView = pathname.toLowerCase() === '/map-view'; // ✅ matches your nav link

  return (
    <div className="flex h-screen">
      {/* Sidebar (collapsed in map view) */}
      <SideBar collapsed={isMapView} />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        <Header className="sticky top-0 z-50 bg-white shadow" />
        <main className="p-4 overflow-y-auto flex-1">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
