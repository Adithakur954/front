/**
 * A centralized place for all API calls.
 */

// Use environment variables for the base URL in a real application
const API_BASE_URL = 'http://localhost:5224'; // Ensure this matches your .NET backend URL

/**
 * A helper function to handle API requests, centralizing error handling,
 * authentication, and headers.
 * @param {string} endpoint - The API endpoint to call (e.g., '/Admin/GetDashboardData').
 * @param {object} options - Optional fetch options, including a 'params' object for GET requests.
 * @returns {Promise<any>} - The JSON response from the API.
 */
const apiService = async (endpoint, { body, params, ...customOptions } = {}) => {
  const isFormData = body instanceof FormData;

  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  const config = {
    method: customOptions.method || 'GET',
    ...customOptions,
    headers: {
      ...headers,
      ...customOptions.headers,
    },
    credentials: 'include', // Important for sending session cookies
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  // ✅ --- START OF THE FIX ---
  // Create a full URL object to easily manage the endpoint and search params
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // If a 'params' object exists, add it to the URL's query string
  if (params) {
    // URLSearchParams correctly formats { key: 'value' } into "?key=value"
    url.search = new URLSearchParams(params).toString();
  }
  // ✅ --- END OF THE FIX ---

  try {
    // Use the newly constructed URL object in the fetch call
    const response = await fetch(url.toString(), config);

    if (response.status === 401) {
      console.error("Unauthorized request. Session may have expired.");
      // Optional: Redirect to login page
      // window.location.href = '/login';
    }
    
    // Handle 204 No Content response
    if (response.status === 204) {
        return null; 
    }

    // Check for other errors (like 400, 404, 500)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText // Fallback if the error response isn't JSON
      }));
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    // Handle different response types (JSON for data, Blob for files)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    } else {
        return response.blob(); // For file downloads
    }

  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error; // Re-throw the error so it can be caught by the component
  }
};

export const api = {
  get: (endpoint, options = {}) => apiService(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiService(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiService(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiService(endpoint, { ...options, method: 'DELETE' }),
};