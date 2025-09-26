// src/api/apiEndpoints.js

import { api } from "./apiService";

export const authApi = {
  checkStatus: () => api.get("/api/auth/status"),
};

/* ---------------- ADMIN CONTROLLER ---------------- */
export const adminApi = {
  getReactDashboardData: () => api.get("/Admin/GetReactDashboardData"),
  getDashboardGraphData: () => api.get("/Admin/GetDashboardGraphData"),
  getAllUsers: (filters) => api.post("/Admin/GetAllUsers", filters),
  getUsers: (params) => api.get("/Admin/GetUsers", { params }),
 getOperatorCoverageRanking: ({ min, max }) =>
    api.get('/Admin/GetOperatorCoverageRanking', { params: { min, max } }),
  getOperatorQualityRanking: ({ min, max }) =>
    api.get('/Admin/GetOperatorQualityRanking', { params: { min, max } }),
  getUserById: (userId) => {
    const formData = new FormData();
    formData.append("UserID", userId);
    formData.append("token", "");
    return api.post(`/Admin/GetUser`, formData);
  },

  saveUserDetails: (data) => api.post("/Admin/SaveUserDetails", data),
  deleteUser: (id) => api.post(`/Admin/DeleteUser?id=${id}`),
  userResetPassword: (data) => api.post("/Admin/UserResetPassword", data),
  changePassword: (data) => api.post("/Admin/ChangePassword", data),
  getSessions: () => api.get("/Admin/GetSessions"),
  getAllNetworkLogs: (params) => {
    return api.get("/Admin/GetAllNetworkLogs", { params });
  },
  deleteSession: (sessionId) => {
    return api.delete(`/Admin/DeleteSession/DeleteSession?id=${parseInt(sessionId, 10)}`);
  },
  getSessionsByFilter: (filters) => {
    return api.get("/Admin/GetSessionsByDateRange", filters);
  }
};

/* ---------------- MAP VIEW CONTROLLER ---------------- */
export const mapViewApi = {
    
    signup: (user) => api.post("/api/MapView/user_signup", user),

    getLogsByDateRange: (filters) => api.get("/api/MapView/GetLogsByDateRange", { params: filters }),

    
    startSession: (data) => api.post("/api/MapView/start_session", data),

   
    endSession: (data) => api.post("/api/MapView/end_session", data),

    getNetworkLog: (sessionId) => api.get(`/api/MapView/GetNetworkLog?session_id=${sessionId}`),

   
    getPredictionLog: (params) => api.get("/api/MapView/GetPredictionLog", { params }),

    
    getProjectPolygons: (projectId) => api.get(`/api/MapView/GetProjectPolygons?projectId=${projectId}`),

    
    getProjects: () => api.get("/api/MapView/GetProjects"),

    getBands: () => api.get("/api/MapView/GetBands"),

    
    uploadImage: (formData) => api.post("/api/MapView/UploadImage", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    
    logNetwork: (data) => api.post("/api/MapView/log_networkAsync", data),

    
    getProviders: () => api.get("/api/MapView/GetProviders"),

   
    getTechnologies: () => api.get("/api/MapView/GetTechnologies"),

   
};

/* ---------------- HOME CONTROLLER ---------------- */
export const homeApi = {
  login: (credentials) => api.post("/Home/UserLogin", credentials),
  getStateInfo: () => api.post("/Home/GetStateIformation"),
  forgotPassword: (data) => api.post("/Home/GetUserForgotPassword", data),
  resetPassword: (data) => api.post("/Home/ForgotResetPassword", data),
  logout: () => api.post("/Home/Logout"),
  getLoggedUser: (ip) => api.post("/Home/GetLoggedUser", { ip }),
  getMasterUserTypes: () => api.post("/Home/GetMasterUserTypes"),
};

/* ---------------- SETTING CONTROLLER ---------------- */
export const settingApi = {
  checkSession: () => api.get("/api/Setting/CheckSession"),
  getThresholdSettings: () => api.get("/api/Setting/GetThresholdSettings"),
  saveThreshold: (payload) => api.post("/api/Setting/SaveThreshold", payload),
};

/* ---------------- EXCEL UPLOAD CONTROLLER ---------------- */
export const excelApi = {
  
  uploadFile: (formData) => api.post('/ExcelUpload/UploadExcelFile', formData),

  
  

  
  downloadTemplate: (fileType) => {
    
    return api.get('/ExcelUpload/DownloadExcel', {
      params: {
        FileType: fileType
      }
    });
  },

  getUploadedFiles: (type) => api.get(`/ExcelUpload/GetUploadedExcelFiles?FileType=${type}`),

  getSessions: (fromDate, toDate) => api.get('/api/excel/sessions', {
    params: {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString()
    }
  }),
};