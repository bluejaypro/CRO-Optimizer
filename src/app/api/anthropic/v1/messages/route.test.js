import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { POST } from './route.js';

const originalFetch = global.fetch;
const originalApiKey = process.env.ANTHROPIC_API_KEY;

test('missing ANTHROPIC_API_KEY returns 500 error', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    try {
        const mockReq = {
            json: async () => ({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'claude-3-5-sonnet-20241022'
            })
        };

        const response = await POST(mockReq);
        const data = await response.json();

        assert.strictEqual(response.status, 500);
        assert.strictEqual(data.error, 'API keys not configured');
    } finally {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
});

test('successful Anthropic API call returns 200 response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    global.fetch = async (url, options) => {
        assert.strictEqual(url, 'https://api.anthropic.com/v1/messages');
        assert.strictEqual(options.headers['x-api-key'], 'test-key');

        return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'msg_123', content: [{ text: 'Response from Claude' }] })
        };
    };

    try {
        const mockReq = {
            json: async () => ({
                messages: [{ role: 'user', content: 'Hello' }]
            })
        };

        const response = await POST(mockReq);
        const data = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(data.id, 'msg_123');
    } finally {
        global.fetch = originalFetch;
        process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
});

test('Anthropic API error returns the same status and error detail', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    global.fetch = async () => {
        return {
            ok: false,
            status: 400,
            json: async () => ({ error: { type: 'invalid_request_error', message: 'Invalid messages' } })
        };
    };

    try {
        const mockReq = {
            json: async () => ({
                messages: [] // Missing messages
            })
        };

        const response = await POST(mockReq);
        const data = await response.json();

        assert.strictEqual(response.status, 400);
        assert.strictEqual(data.error.type, 'invalid_request_error');
    } finally {
        global.fetch = originalFetch;
        process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
});
