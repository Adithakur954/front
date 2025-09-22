import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../Header';
import SideBar from '../SideBar';

const AppLayout = ({ children }) => {
  const { pathname } = useLocation();
  const isMapView = pathname.toLowerCase() === '/map-view'; 

  return (
    <div className="flex h-screen">
      
      <SideBar collapsed={isMapView} />

      
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <Header className="sticky top-0 z-50 bg-white shadow" />
        <main className=" overflow-y-auto flex-1">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
