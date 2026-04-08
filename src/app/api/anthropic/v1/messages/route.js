import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
];

export async function POST(req) {
    try {
        const body = await req.json();
        const { messages, model, max_tokens, system, tools, tool_choice } = body;

        // --- Input Validation ---
        if (model && !ALLOWED_MODELS.includes(model)) {
            return NextResponse.json({ error: { message: `Invalid model: ${model}. Allowed models: ${ALLOWED_MODELS.join(', ')}`, type: "invalid_request_error" } }, { status: 400 });
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: { message: "messages must be a non-empty array", type: "invalid_request_error" } }, { status: 400 });
        }

        if (max_tokens !== undefined && (!Number.isInteger(max_tokens) || max_tokens <= 0)) {
            return NextResponse.json({ error: { message: "max_tokens must be a positive integer", type: "invalid_request_error" } }, { status: 400 });
        }

        if (system !== undefined && typeof system !== 'string' && !Array.isArray(system)) {
            return NextResponse.json({ error: { message: "system must be a string or an array of content blocks", type: "invalid_request_error" } }, { status: 400 });
        }
        // --- End Input Validation ---

        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

        if (!ANTHROPIC_API_KEY) {
            console.error("[Claude Proxy] Missing API keys");
            return NextResponse.json({ error: "API keys not configured" }, { status: 500 });
        }

        const cleanAnthropicKey = ANTHROPIC_API_KEY.replace(/["']/g, '').trim();

        console.log("[Claude Proxy] Calling Anthropic...");
        const payload = {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: max_tokens || 4096,
            messages
        };
        if (system) payload.system = system;
        if (tools && tools.length > 0) payload.tools = tools;
        if (tool_choice) payload.tool_choice = tool_choice;

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': cleanAnthropicKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload)
        });

        if (!anthropicRes.ok) {
            const errorData = await anthropicRes.json();
            console.error('[Claude Proxy] Anthropic error detail:', JSON.stringify(errorData, null, 2));
            return NextResponse.json(errorData, { status: anthropicRes.status });
        }

        const data = await anthropicRes.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Claude Proxy] Fatal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
