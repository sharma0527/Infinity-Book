export async function onRequestPost(context) {
    const { request, env } = context;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }

    let { messages, chatId, userId } = body;
    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Invalid messages array." }), { status: 400 });
    }

    const systemPrompt = `You are Infinity AI, an advanced AI assistant specialized in education, programming, research, productivity, writing, and problem solving.\n\nProvide accurate, detailed, well-structured answers.\n\nWhen explaining concepts:\n* Start with a simple explanation.\n* Then provide technical details.\n* Give examples whenever useful.\n\nFor coding questions:\n* Provide complete working code.\n* Explain important parts.\n* Suggest best practices.\n\nFor career and learning questions:\n* Give practical step-by-step guidance.\n\nAlways prioritize correctness, clarity, and usefulness.`;

    if (messages.length === 0 || messages[0].role !== 'system') {
        messages = [{ role: 'system', content: systemPrompt }, ...messages];
    }

    // 1. Try OpenRouter First
    if (env.OPENROUTER_API_KEY) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://infinity-book.pages.dev',
                    'X-Title': 'Infinity Book'
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
                    messages: messages,
                    temperature: 0.7,
                    stream: true
                })
            });

            if (response.ok) {
                return new Response(response.body, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                });
            } else {
                console.error("[OpenRouter] API error:", await response.text());
            }
        } catch (err) {
            console.error("[OpenRouter] Failover trigger:", err.message);
        }
    }

    // 2. Try Groq Second
    if (env.GROQ_API_KEY) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: messages,
                    temperature: 0.7,
                    stream: true
                })
            });

            if (response.ok) {
                return new Response(response.body, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                });
            } else {
                console.error("[Groq] API error:", await response.text());
            }
        } catch (err) {
            console.error("[Groq] Failover trigger:", err.message);
        }
    }

    // 3. Fallback Mock Response (if both keys missing or both failed)
    console.warn("[Failover] Both providers failed or keys missing. Streaming local mock.");
    const mockAnswer = `Hello! I am Infinity AI, your intelligent copilot. I am here to help you brainstorm and organize your book. You can:\n- Write and sketch collaboratively in real-time.\n- Manage multiple pages using the navigation arrows.\n- Export your work at any time.\n\nWhat would you like to build or discuss next?`;
    
    // Cloudflare Workers readable stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    
    // We execute the writing asynchronously so we can return the response immediately
    (async () => {
        const encoder = new TextEncoder();
        const words = mockAnswer.split(' ');
        for (let i = 0; i < words.length; i++) {
            const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
            const data = { choices: [{ delta: { content: chunk } }] };
            await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            
            // Artificial delay to simulate streaming
            await new Promise(r => setTimeout(r, 50));
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
    })();

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
