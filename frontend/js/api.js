/* ============================================
   COMEDK Official — API Fetch Wrapper
   ============================================ */

/**
 * Core API request function.
 * Prepends API_BASE_URL, attaches auth token from localStorage,
 * handles JSON parsing and error responses.
 *
 * @param {string} endpoint - API endpoint path (e.g., '/leads')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach auth token if present
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge options
  const fetchOptions = {
    ...options,
    headers,
  };

  // Convert body to JSON string if it is an object
  if (fetchOptions.body && typeof fetchOptions.body === 'object') {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    // Handle non-JSON responses (e.g., 204 No Content)
    if (response.status === 204) {
      return null;
    }

    // Parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Failed to parse response from ${endpoint}`);
    }

    // Handle error responses
    if (!response.ok) {
      const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Re-throw API errors
    if (error.status) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const networkError = new Error('Network error. Please check your connection and try again.');
      networkError.status = 0;
      throw networkError;
    }

    throw error;
  }
}

/**
 * GET request helper.
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Optional query parameters
 * @returns {Promise<Object>}
 */
function get(endpoint, params = {}) {
  // Build query string from params
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

  return apiRequest(fullEndpoint, {
    method: 'GET',
  });
}

/**
 * POST request helper.
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body data
 * @returns {Promise<Object>}
 */
function post(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    body,
  });
}

/**
 * PATCH request helper.
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body data
 * @returns {Promise<Object>}
 */
function patch(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: 'PATCH',
    body,
  });
}

/**
 * DELETE request helper.
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<Object>}
 */
function del(endpoint) {
  return apiRequest(endpoint, {
    method: 'DELETE',
  });
}
