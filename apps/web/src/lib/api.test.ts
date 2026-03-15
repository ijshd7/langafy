import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiError, apiClient } from './api';

// Helper to create a mock Response
function mockResponse(
  body: unknown,
  status: number,
  contentType = 'application/json'
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: (key: string) => (key === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => String(body),
  } as unknown as Response;
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset any token provider between tests
    apiClient.setTokenProvider(async () => null);
  });

  // ── GET ────────────────────────────────────────────────────────────────────

  it('GET sends a fetch with correct method and URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ data: 'ok' }, 200)
    );

    await apiClient.get('/languages');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/languages');
    expect(opts?.method).toBe('GET');
  });

  it('GET appends query parameters to the URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse([], 200)
    );

    await apiClient.get('/progress', { params: { language: 'es' } });

    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('language=es');
  });

  // ── POST ───────────────────────────────────────────────────────────────────

  it('POST serializes body to JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ correct: true }, 200)
    );

    await apiClient.post('/exercises/1/submit', { selectedIndex: 0 });

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts?.method).toBe('POST');
    expect(opts?.body).toBe(JSON.stringify({ selectedIndex: 0 }));
  });

  // ── Auth token injection ───────────────────────────────────────────────────

  it('injects Bearer token when a tokenProvider is set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({}, 200)
    );
    apiClient.setTokenProvider(async () => 'my-firebase-token');

    await apiClient.get('/progress');

    const [, opts] = fetchSpy.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-firebase-token');
  });

  it('does not set Authorization header when tokenProvider returns null', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({}, 200)
    );
    apiClient.setTokenProvider(async () => null);

    await apiClient.get('/languages');

    const [, opts] = fetchSpy.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('throws ApiError with statusCode on a 4xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse('Not Found', 404, 'text/plain')
    );

    await expect(apiClient.get('/nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ApiError parsing the API error envelope format', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse(
        { error: { code: 'DUPLICATE_LANGUAGE', message: 'Language already added' } },
        409
      )
    );

    const error = await apiClient.post('/user/languages', {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE_LANGUAGE');
    expect(error.message).toBe('Language already added');
  });

  it('throws ApiError with HTTP_ERROR code for plain text error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse('Internal Server Error', 500, 'text/plain')
    );

    const error = await apiClient.get('/languages').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('HTTP_ERROR');
  });

  it('returns parsed JSON on a successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: '1', code: 'es' }, 200)
    );

    const result = await apiClient.get<{ id: string; code: string }>('/languages/es');

    expect(result).toEqual({ id: '1', code: 'es' });
  });
});
