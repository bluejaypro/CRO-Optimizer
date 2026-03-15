import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req) {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { messages, model, max_tokens, system, tools, tool_choice } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
        console.error("[Claude Proxy] Missing API keys");
        return NextResponse.json({ error: "API keys not configured" }, { status: 500 });
    }

    const cleanAnthropicKey = ANTHROPIC_API_KEY.replace(/["']/g, '').trim();

    const payload = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: Math.min(max_tokens || 4096, 8192),
        messages
    };
    if (system) payload.system = system;
    if (tools && tools.length > 0) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': cleanAnthropicKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!anthropicRes.ok) {
            const errorData = await anthropicRes.json();
            console.error('[Claude Proxy] Anthropic error:', anthropicRes.status, JSON.stringify(errorData));
            return NextResponse.json(
                { error: 'Upstream API error', status: anthropicRes.status },
                { status: anthropicRes.status }
            );
        }

        const data = await anthropicRes.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Claude Proxy] Fatal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
