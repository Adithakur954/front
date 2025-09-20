import { api } from "./apiService";




/* ---------------- AUTHENTICATION & SESSION API ---------------- */
/**
 * A dedicated section for handling user session and authentication status.
 */
export const authApi = {
  /**
   * Checks if the user has a valid session cookie.
   * This is a new, essential endpoint you need to create on your backend.
   * It should be a protected [HttpGet] endpoint that returns the current user's data.
   * Example Route: [Authorize, HttpGet("/api/auth/status")]
   */
  checkStatus: () => api.get('/api/auth/status'),
};


/* ---------------- ADMIN CONTROLLER ---------------- */
export const adminApi = {
  getReactDashboardData: () => api.get("/Admin/GetReactDashboardData"),
  getDashboardGraphData: () => api.get("/Admin/GetDashboardGraphData"),
  getAllUsers: (filters) => api.post("/Admin/GetAllUsers", filters),
  getUsers: (params) => api.get("/Admin/GetUsers", { params }),
  
  getUserById: (userId) => {
    const formData = new FormData();
    formData.append('UserID', userId);
    formData.append('token', '');
    return api.post(`/Admin/GetUser`, formData);
  },

  saveUserDetails: (data) => api.post("/Admin/SaveUserDetails", data),
  deleteUser: (id) => api.post(`/Admin/DeleteUser?id=${id}`),
  userResetPassword: (data) => api.post("/Admin/UserResetPassword", data),
  changePassword: (data) => api.post("/Admin/ChangePassword", data),
  getSessions: () => api.get("/Admin/GetSessions"),
  getAllNetworkLogs: (params) => {
        // Make sure this is a GET request with query parameters
        return api.get('/Admin/GetAllNetworkLogs', { params });
    },
};

/* ---------------- EXCEL UPLOAD CONTROLLER ---------------- */

export const excelApi = {
    uploadFile: (formData) => {
        return api.post('/ExcelUpload/UploadExcelFile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getUploadedFiles: (fileType) => {
        return api.get(`/ExcelUpload/GetUploadedExcelFiles?FileType=${fileType}`);
    },
    
    downloadTemplate: (fileType) => {
        return api.get(`/ExcelUpload/DownloadExcel?FileType=${fileType}`, {
            responseType: 'blob', 
        });


    },
    

    getSessions: (fromDate, toDate) => {
        return api.get(`/ExcelUpload/GetSessions?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);
    }
    ,getDriveTestSessions: () => {
        return api.get('/Admin/GetSessions');
    }
};

/* ---------------- MAP VIEW CONTROLLER ---------------- */
export const mapViewApi = {
    // Existing endpoints
    signup: (user) => api.post("/MapView/user_signup", user),
    startSession: (data) => api.post("/MapView/start_session", data),
    endSession: (data) => api.post("/MapView/end_session", data),
    getNetworkLog: (params) => api.get("/MapView/GetNetworkLog", { params }),
    getPredictionLog: (params) => api.get("/MapView/GetPredictionLog", { params }),
    getProjectPolygons: (projectId) => api.get(`/MapView/GetProjectPolygons?projectId=${projectId}`),
    getProjects: () => api.get("/MapView/GetProjects"),
    uploadImage: (formData) => api.post("/MapView/UploadImage", formData),
    logNetwork: (data) => api.post("/MapView/log_networkAsync", data),
    getProviders: () => api.get('/MapView/GetProviders'),
    getTechnologies: () => api.get('/MapView/GetTechnologies'),
    
    // New endpoints for RF analytics
    getCellSites: (filters) => api.get("/MapView/GetCellSites", { params: filters }),
    getServingCells: (params) => api.get("/MapView/GetServingCells", { params }),
    getCrowdsourceData: (filters) => api.get("/MapView/GetCrowdsourceData", { params: filters }),
    getElevationProfile: (points) => api.post("/MapView/GetElevationProfile", points),
    getNetworkIssues: (filters) => api.get("/MapView/GetNetworkIssues", { params: filters }),
    createTask: (taskData) => api.post("/MapView/CreateTask", taskData),
    getTasks: (filters) => api.get("/MapView/GetTasks", { params: filters }),
    updateTask: (taskId, updates) => api.put(`/MapView/UpdateTask/${taskId}`, updates)
};
  


/* ---------------- HOME CONTROLLER ---------------- */
export const homeApi = {
  login: (credentials) => api.post("/Home/UserLogin", credentials),
  getStateInfo: () => api.post("/Home/GetStateIformation"),
  forgotPassword: (data) => api.post("/Home/GetUserForgotPassword", data),
  resetPassword: (data) => api.post("/Home/ForgotResetPassword", data),
  logout: () => api.post('/Home/Logout'),
  getLoggedUser: (ip) => api.post("/Home/GetLoggedUser", { ip }),
  getMasterUserTypes: () => api.post("/Home/GetMasterUserTypes"),
};

/* ---------------- SETTING CONTROLLER ---------------- */
export const settingApi = {
    getThresholdSettings: () => api.get("/Setting/GetThresholdSettings"),
    saveThreshold: (data) => api.post("/Setting/SaveThreshold", data),
};