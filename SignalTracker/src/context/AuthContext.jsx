import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeApi } from '../api/apiEndpoints';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = sessionStorage.getItem('user');
       
        if (storedUser && storedUser !== "undefined") {
            try {
                return JSON.parse(storedUser);
            } catch (error) {
                console.error("Failed to parse user from session storage", error);
                return null;
            }
        }
        return null;
    });
    const navigate = useNavigate();

    const login = async (userData) => { 
        try {
            const response = await homeApi.login(userData);
            console.log("API Login Response:", response);
            if (response.success) {
                setUser(response.user);
                sessionStorage.setItem('user', JSON.stringify(response.user));
            }
            return response;
        } catch (error) {
            console.error("Login failed in AuthContext:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await homeApi.logout();
        } catch (error) {
            console.error("Backend logout failed, proceeding with client-side logout.", error);
        } finally {
            setUser(null);
            sessionStorage.removeItem('user');
            navigate('/login', { replace: true });
        }
    };

    const isAuthenticated = () => !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;