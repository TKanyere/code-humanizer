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
        const { type, content, language } = JSON.parse(event.body);

        if (!content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Content is required" }),
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

        if (type === 'repo' || content.match(/github\.com\/([^\/]+)\/([^\/]+)/)) {
            // REPO MODE
            const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
            const match = content.match(githubRegex);

            if (!match) {
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid GitHub URL" }) };
            }

            const owner = match[1];
            const repo = match[2];

            // 1. Fetch File Tree (Recursive)
            const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
            const treeRes = await fetch(treeUrl);

            let fileTree = [];
            if (treeRes.ok) {
                const treeData = await treeRes.json();
                fileTree = treeData.tree.map(f => f.path);
            } else {
                // Fallback for non-main branch or private/error
                console.warn("Failed to fetch tree, falling back to README only");
            }

            // 2. Identify Key Files (Heuristic)
            const keyFiles = [
                'README.md',
                'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', // Dependencies
                'src/index.js', 'main.py', 'src/main.rs', 'app.js', 'index.html' // Entry points
            ];

            const foundKeyFiles = fileTree.filter(path => keyFiles.some(k => path.endsWith(k))).slice(0, 5); // Limit to 5 files

            // Always try README if not found in tree (e.g. if tree fetch failed)
            if (!foundKeyFiles.includes('README.md')) foundKeyFiles.unshift('README.md');

            // 3. Fetch Content of Key Files
            let context = `File Structure (Partial): \n${fileTree.slice(0, 20).join('\n')}\n...(${fileTree.length} files total)\n\n`;

            for (const filePath of foundKeyFiles) {
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
                const res = await fetch(rawUrl);
                if (res.ok) {
                    const text = await res.text();
                    context += `\n--- START FILE: ${filePath} ---\n${text.substring(0, 3000)}\n--- END FILE ---\n`;
                }
            }

            prompt = `
                You are a senior software architect.
                Analyze this GitHub repository: ${owner}/${repo}.
                
                Context provided:
                ${context}

                Task: Provide a COMPREHENSIVE summary of this project.
                Structure:
                1. **What it does**: 1-2 sentences.
                2. **Tech Stack**: Detected languages/frameworks.
                3. **Key Features**: Bullet points based on code analysis.
                4. **Architecture**: How the entry points connect (if visible).
                
                Constraint: Be concise but thorough. Focus on technical details, not marketing fluff.
            `;

        } else {
            // CODE MODE
            prompt = `
                You are a senior developer doing a code review.
                Explain this ${language ? language + " " : ""}code snippet.
                
                Code:
                \`\`\`
                ${content}
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
