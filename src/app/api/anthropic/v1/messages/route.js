const ANTHROPIC_API_KEY = typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined;

export const runtime = 'edge';

// Conditional import to handle non-Next environments
let NextResponse;
try {
    const nextServer = await import('next/server');
    NextResponse = nextServer.NextResponse;
} catch (e) {
    // Fallback for tests
    NextResponse = {
        json: (data, options = {}) => {
            const status = options.status || 200;
            return {
                status,
                json: async () => data,
                ok: status >= 200 && status < 300
            };
        }
    };
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { messages, model, max_tokens, system, tools, tool_choice } = body;

        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            console.error("[Claude Proxy] Missing API keys");
            return NextResponse.json({ error: "API keys not configured" }, { status: 500 });
        }

        const cleanAnthropicKey = apiKey.replace(/["']/g, '').trim();

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
