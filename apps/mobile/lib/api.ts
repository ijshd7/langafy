import { ApiResponse } from '@langafy/shared-types';
import Constants from 'expo-constants';

import * as firebaseLib from '@/lib/firebase';

/**
 * API Error class for standardized error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Options for API requests
 */
export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * API Client for communicating with the backend
 *
 * Features:
 * - Typed request/response handling with generic types
 * - Automatic Authorization header injection from Firebase token
 * - Environment-based base URL configuration
 * - Comprehensive error handling and parsing
 * - Request parameter serialization
 */
class ApiClient {
  private baseUrl: string;
  private tokenProvider?: () => Promise<string | null>;

  constructor(baseUrl?: string) {
    const raw = baseUrl || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
    // Ensure the base always includes the /api prefix
    this.baseUrl = raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
  }

  /**
   * Set a function to provide the Firebase authentication token
   * This is called on every request to inject the current token
   */
  setTokenProvider(provider: () => Promise<string | null>) {
    this.tokenProvider = provider;
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    // Concatenate base + endpoint instead of using new URL(path, base),
    // which drops the base path when endpoint starts with '/'.
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers including authorization if token is available
   */
  private async buildHeaders(options?: ApiRequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      ...(typeof options?.headers === 'object' ? options.headers : {}),
    };

    // Set Content-Type if not already set
    if (!headers['Content-Type'] && options?.body) {
      headers['Content-Type'] = 'application/json';
    }

    // Inject Firebase token if available
    if (this.tokenProvider) {
      const token = await this.tokenProvider();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Parse and handle API response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorData: unknown;

      try {
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch {
        errorData = null;
      }

      // Handle API error response structure
      if (typeof errorData === 'object' && errorData !== null && 'error' in errorData) {
        const apiError = errorData as { error: { code: string; message: string } };
        throw new ApiError(response.status, apiError.error.code, apiError.error.message, errorData);
      }

      // Handle generic error response
      throw new ApiError(
        response.status,
        'HTTP_ERROR',
        errorData instanceof Object && 'message' in errorData
          ? String(errorData.message)
          : `HTTP ${response.status}: ${response.statusText}`,
        errorData
      );
    }

    // Parse success response
    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    return undefined as T;
  }

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = await this.buildHeaders(options);

    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = await this.buildHeaders(options);

    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = await this.buildHeaders(options);

    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    const headers = await this.buildHeaders(options);

    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers,
    });

    return this.parseResponse<T>(response);
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

/**
 * Initialize API client with Firebase token provider
 * Call this once after Firebase is initialized (typically in your root provider)
 */
export function initializeApiClient() {
  apiClient.setTokenProvider(() => firebaseLib.getAuthToken());
}

/**
 * Type-safe wrapper for API responses
 * Use this when the API returns an ApiResponse<T> wrapper
 */
export async function getApiData<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;
  if (!response.success || !response.data) {
    throw new ApiError(
      400,
      response.error?.code || 'UNKNOWN_ERROR',
      response.error?.message || 'Unknown API error'
    );
  }
  return response.data;
}

export default apiClient;
