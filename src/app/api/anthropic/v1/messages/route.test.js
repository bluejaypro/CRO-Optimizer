import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { POST } from './route.js';

describe('Claude Proxy API Route', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        global.fetch = async () => {
            throw new Error('Fetch not mocked');
        };
    });

    after(() => {
        process.env = originalEnv;
    });

    test('should return 500 if ANTHROPIC_API_KEY is missing', async () => {
        delete process.env.ANTHROPIC_API_KEY;

        const req = {
            json: async () => ({ messages: [] })
        };

        const res = await POST(req);
        const data = await res.json();

        assert.strictEqual(res.status, 500);
        assert.strictEqual(data.error, 'API keys not configured');
    });

    test('should return successful response from Anthropic', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';

        const mockResponse = { id: 'msg_123', content: [{ text: 'Hello' }] };

        global.fetch = async (url, options) => {
            assert.strictEqual(url, 'https://api.anthropic.com/v1/messages');
            assert.strictEqual(options.headers['x-api-key'], 'test-key');
            return {
                ok: true,
                status: 200,
                json: async () => mockResponse
            };
        };

        const req = {
            json: async () => ({
                messages: [{ role: 'user', content: 'Hi' }],
                model: 'claude-3-opus-20240229'
            })
        };

        const res = await POST(req);
        const data = await res.json();

        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(data, mockResponse);
    });

    test('should handle Anthropic API errors', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';

        const errorResponse = { error: { type: 'invalid_request_error', message: 'Invalid model' } };

        global.fetch = async () => {
            return {
                ok: false,
                status: 400,
                json: async () => errorResponse
            };
        };

        const req = {
            json: async () => ({ messages: [] })
        };

        const res = await POST(req);
        const data = await res.json();

        assert.strictEqual(res.status, 400);
        assert.deepStrictEqual(data, errorResponse);
    });

    test('should handle fatal errors', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';

        const req = {
            json: async () => { throw new Error('Parsing error'); }
        };

        const res = await POST(req);
        const data = await res.json();

        assert.strictEqual(res.status, 500);
        assert.strictEqual(data.error, 'Internal Server Error');
        assert.strictEqual(data.details, 'Parsing error');
    });

    test('should use default model and max_tokens if not provided', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';

        let capturedPayload;
        global.fetch = async (url, options) => {
            capturedPayload = JSON.parse(options.body);
            return {
                ok: true,
                status: 200,
                json: async () => ({})
            };
        };

        const req = {
            json: async () => ({
                messages: [{ role: 'user', content: 'Hi' }]
            })
        };

        await POST(req);

        assert.strictEqual(capturedPayload.model, 'claude-3-5-sonnet-20241022');
        assert.strictEqual(capturedPayload.max_tokens, 4096);
    });
});
