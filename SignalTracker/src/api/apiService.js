/**
 * A centralized place for all API calls.
 */

// Use environment variables for the base URL in a real application
const API_BASE_URL = 'http://localhost:5224'; // Ensure this matches your .NET backend URL

/**
 * A helper function to handle API requests, centralizing error handling,
 * authentication, and headers.
 * @param {string} endpoint - The API endpoint to call (e.g., '/Admin/GetDashboardData').
 * @param {object} options - Optional fetch options (method, body, custom headers).
 * @returns {Promise<any>} - The JSON response from the API.
 */
const apiService = async (endpoint, { body, ...customOptions } = {}) => {
  const isFormData = body instanceof FormData;

 const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  const config = {
    method: customOptions.method || 'GET',
    ...customOptions,
    headers: {
      ...headers,
      ...customOptions.headers,
    },
    credentials: 'include',
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      console.error("Unauthorized request. Session may have expired.");
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText
      }));
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    if (response.status === 204) {
        return null;
    }

    // THIS IS THE FIX: Check content type to handle files vs JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        return response.blob(); // Return the response as a blob for file downloads
    }

  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};

export const api = {
  get: (endpoint, options = {}) => apiService(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiService(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiService(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiService(endpoint, { ...options, method: 'DELETE' }),
};
export const getMapLayerOptions = (sessionId) => {
  return api.get(`/map/get-layer-options/${sessionId}`);
};