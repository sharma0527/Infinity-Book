const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// POST /api/interview/match-score
router.post('/match-score', async (req, res) => {
    try {
        const { text, jobDesc } = req.body;
        if (!text || !jobDesc) {
            return res.status(400).json({ success: false, error: "Resume and Job Description are required." });
        }

        const prompt = `Analyze this candidate's Resume against the provided Job Description.
Resume:
${text}

Job Description:
${jobDesc}

Return ONLY a JSON object exactly like this:
{
  "score": "89%",
  "missingSkills": ["Skill 1", "Skill 2"],
  "improvements": ["Add deployment experience", "Highlight team collaboration"]
}`;

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "x-ai/grok-2-1212",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Infinity AI"
                }
            }
        );

        let content = response.data.choices[0].message.content;
        if (content.includes('{')) {
            content = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        }
        
        const parsed = JSON.parse(content);
        return res.json({ success: true, ...parsed });
    } catch (err) {
        console.error("Match Score Error:", err.message);
        return res.status(500).json({ success: false, error: "Failed to calculate match score." });
    }
});

// POST /api/interview/generate
router.post('/generate', async (req, res) => {
    try {
        const { text, role, mode, jobDesc } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: "Resume text is required." });
        }

        console.log(`Generating ${mode || 'HR'} Questions...`);
        
        const modeContext = mode ? `This is a ${mode} Interview.` : "This is an HR Interview.";
        const jobDescContext = jobDesc ? `Focus heavily on the skills required in this Job Description:\n${jobDesc}` : "";

        const prompt = `Candidate Resume:
${text}

${modeContext}
${jobDescContext}

Generate exactly 5 interview questions for the role of ${role}.
Rules:
- Ask only from the resume details, skills, and projects, aligned with the interview mode.
- If it's a Technical or System Design interview, make the questions highly technical based on their specific listed projects.
- Never repeat previous questions.
- Increase difficulty gradually.
- Return ONLY a JSON object containing a 'name' field and a 'questions' array. Like this:
{
  "name": "Candidate First Name",
  "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"]
}`;

        console.log("Calling OpenRouter with prompt...");
        
        let response;
        try {
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "x-ai/grok-2-1212",
                    messages: [
                        { role: "system", content: "You are an expert HR interviewer. You must return valid JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.95
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        } catch (err) {
            console.warn("Primary model failed, trying fallback...", err.response?.data?.error?.message || err.message);
            // Fallback model
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "meta-llama/llama-3.3-70b-instruct",
                    messages: [
                        { role: "system", content: "You are an expert HR interviewer. You must return valid JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.95
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        }

        console.log("OpenRouter Response received.");
        
        let content = response.data.choices[0].message.content;
        if (content.includes('{')) {
            content = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        }
        
        const parsed = JSON.parse(content);
        
        if (parsed.error) {
            return res.json({ success: false, error: parsed.error });
        }

        res.json({
            success: true,
            name: parsed.name,
            questions: parsed.questions
        });
    } catch (err) {
        console.error("OpenRouter Error Data:", err.response?.data);
        console.error("OpenRouter Error Message:", err.message);
        return res.status(500).json({ success: false, error: err.response?.data?.error?.message || err.message || "Failed to generate questions." });
    }
});

// POST /api/interview/evaluate
router.post('/evaluate', async (req, res) => {
    try {
        const { role, question, answer } = req.body;
        
        const prompt = `You are a senior HR Interviewer. The candidate is applying for "${role}".
Question you asked: "${question}"
Candidate's Answer: "${answer}"

Analyze the candidate's answer based on the following criteria:
1. Grammar & Syntax
2. Technical Accuracy
3. Communication & Confidence

If it's correct/good, praise them. If it's wrong, gently correct them.
Return a JSON object ONLY, in this exact format without markdown wrappers:
{
  "spokenFeedback": "Your verbal response (2-3 sentences max). Speak directly to the candidate.",
  "grammar": "Summary of grammatical issues (or 'Perfect' if none).",
  "pronunciation": "Note any phonetically obvious errors based on text, or suggest correct industry pronunciation.",
  "confidenceScore": 85,
  "technicalAccuracy": "Assessment of technical correctness.",
  "hrSuggestion": "One specific tip to improve this answer."
}`;

        let response;
        try {
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "x-ai/grok-2-1212",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        } catch (err) {
            console.warn("Primary model failed in evaluate, trying fallback...", err.response?.data?.error?.message || err.message);
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "meta-llama/llama-3.3-70b-instruct",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        }

        let content = response.data.choices[0].message.content;
        if (content.includes('{')) {
            content = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        }
        
        const result = JSON.parse(content);
        return res.json(result);
    } catch (err) {
        console.error("Interview Evaluation Error:", err.message);
        return res.status(500).json({ error: "Failed to evaluate answer." });
    }
});

// POST /api/interview/summary
router.post('/summary', async (req, res) => {
    try {
        const { transcript, role } = req.body;
        
        const prompt = `You are a Senior Recruiter. Analyze this interview transcript for the role of "${role}".
Transcript:
${transcript}

Determine a Hire Recommendation and provide a list of reasons.
Return ONLY a JSON object in this exact format:
{
  "recommendation": "Strong Hire / Hire / Borderline / No Hire",
  "reasons": ["Reason 1", "Reason 2", "Reason 3"]
}`;

        let response;
        try {
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "x-ai/grok-2-1212",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        } catch (err) {
            response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "meta-llama/llama-3.3-70b-instruct",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Infinity AI"
                    }
                }
            );
        }

        let content = response.data.choices[0].message.content;
        if (content.includes('{')) {
            content = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        }
        
        const parsed = JSON.parse(content);
        return res.json({ success: true, ...parsed });
    } catch (err) {
        console.error("Summary Error:", err.message);
        return res.status(500).json({ success: false, error: "Failed to generate summary." });
    }
});

module.exports = router;
