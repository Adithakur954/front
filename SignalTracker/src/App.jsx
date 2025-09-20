import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'; // Import Link
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AuthProvider,{ useAuth } from './context/AuthContext';

// Import your page components
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import MapViewPage from './pages/MapView';
import ManageUsersPage from './pages/ManageUser';
import DriveTestSessionsPage from './pages/DriveTestSessions';
import AppLayout from './components/layout/AppLayout';
import UploadDataPage from './pages/UploadData';
import SettingsPage from './pages/Setting';
import ManageSessionPage from './pages/ManageSession';


const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }
    return <AppLayout>{children}</AppLayout>; 
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
};

const NotFoundPage = () => (
    <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold">404 - Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="mt-4 text-blue-600 hover:underline">Go to Dashboard</Link>
    </div>
);

function App() {
    useEffect(() => {
        const darkMode = localStorage.getItem("theme") === "dark";
        document.documentElement.classList.toggle("dark", darkMode);
    }, []);

    return (
        <Router>
            <AuthProvider>
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    theme={localStorage.getItem("theme") === "dark" ? "dark" : "light"}
                />
                <Routes>
                    <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
                    
                    {/* Private Routes */}
                    <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/drive-test-sessions" element={<PrivateRoute><DriveTestSessionsPage /></PrivateRoute>} />
                    <Route path="/map-view" element={<PrivateRoute><MapViewPage /></PrivateRoute>} />
                    <Route path="/manage-users" element={<PrivateRoute><ManageUsersPage /></PrivateRoute>} />
                    <Route path="/upload-data" element={<PrivateRoute><UploadDataPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                    <Route path="/manage-session" element={<PrivateRoute><ManageSessionPage /></PrivateRoute>} />

                    
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;