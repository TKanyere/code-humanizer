const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function (event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const { code, language } = JSON.parse(event.body);

        if (!code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Code snippet is required" }),
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error: API Key missing" }),
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        // Check if input is a GitHub URL
        const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
        const match = code.match(githubRegex);

        if (match) {
            const owner = match[1];
            const repo = match[2];

            // Try to fetch README.md (common names)
            const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
            const readmeRes = await fetch(readmeUrl);

            let context = "";
            if (readmeRes.ok) {
                const readmeText = await readmeRes.text();
                context = `Repository README Content:\n${readmeText.substring(0, 5000)}`; // limit context
            } else {
                context = "Could not fetch README. Please analyze based on the repository name context.";
            }

            prompt = `
                You are a concise technical summarizer.
                Analyze this GitHub repository: ${owner}/${repo}.
                
                context:
                ${context}

                Task: Provide a BRIEF, high-level summary of what this project does.
                Constraint: Maximum 3 sentences. No conversational filler ("Here is the summary..."). Direct answer only.
            `;
        } else {
            // Standard Code Explanation
            prompt = `
                You are a senior developer doing a code review.
                Explain this ${language ? language + " " : ""}code snippet.
                
                Code:
                \`\`\`
                ${code}
                \`\`\`
                
                Constraint: Match the length of the explanation to the COMPLEXITY of the code.
                - IF SIMPLE (1-5 lines, basic logic): Be extremely concise (1-2 sentences). No fluff.
                - IF MODERATE (functions, loops, conditions): Provide a brief summary + 1-2 bullet points for key logic.
                - IF COMPLEX (classes, algorithms, async): Provide a high-level summary followed by a numbered step-by-step breakdown.
                
                Avoid conversational filler ("Here is the explanation..."). Start directly with the technical explanation.
            `;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ explanation: text }),
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to generate explanation",
                details: error.message,
                stack: error.stack
            }),
        };
    }
};
