export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        const body = await request.json();
        let { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "Invalid messages array" }), { status: 400 });
        }

        const systemPrompt = `You are Infinity AI, an advanced AI assistant specialized in education, programming, research, productivity, writing, and problem solving.

Provide accurate, detailed, well-structured answers.

When explaining concepts:
* Start with a simple explanation.
* Then provide technical details.
* Give examples whenever useful.

Always prioritize correctness, clarity, and usefulness.`;

        if (messages.length === 0 || messages[0].role !== 'system') {
            messages = [{ role: 'system', content: systemPrompt }, ...messages];
        }

        const apiKey = env.GROQ_API_KEY || env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API Key not configured in Cloudflare environment" }), { status: 500 });
        }

        const isGroq = !!env.GROQ_API_KEY;
        const endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
        const model = isGroq ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free';

        const aiResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                stream: true
            })
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            return new Response(JSON.stringify({ error: `AI API Error: ${errText}` }), { status: 502 });
        }

        // Return the stream directly to the client
        return new Response(aiResponse.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
