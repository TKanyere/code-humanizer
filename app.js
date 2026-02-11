document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    const humanizeCodeBtn = document.getElementById('humanizeCodeBtn');
    const analyzeRepoBtn = document.getElementById('analyzeRepoBtn');

    // Inputs
    const codeInput = document.getElementById('codeInput');
    const repoInput = document.getElementById('repoInput');

    // Results
    const resultArea = document.getElementById('resultArea');
    const explanationContent = document.getElementById('explanationContent');
    const copyBtn = document.getElementById('copyBtn');

    // Handler for Code Explanation
    humanizeCodeBtn.addEventListener('click', () => handleHumanize('code'));

    // Handler for Repo Analysis
    analyzeRepoBtn.addEventListener('click', () => handleHumanize('repo'));

    async function handleHumanize(type) {
        const inputElement = type === 'code' ? codeInput : repoInput;
        const button = type === 'code' ? humanizeCodeBtn : analyzeRepoBtn;
        const content = inputElement.value.trim();

        if (!content) {
            alert(type === 'code' ? 'Please paste some code!' : 'Please enter a GitHub URL!');
            return;
        }

        setLoading(true, button, type);

        try {
            const response = await fetch('/.netlify/functions/humanize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, content }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to process request');
            }

            // Render Markdown
            explanationContent.innerHTML = marked.parse(data.explanation);

            // Show Result
            resultArea.classList.remove('hidden');
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error:', error);
            resultArea.classList.remove('hidden');
            explanationContent.innerHTML = `
                <div style="color: #f87171; background: rgba(127, 29, 29, 0.4); padding: 1rem; border-radius: 8px; border: 1px solid #f87171;">
                    <h3 style="margin-bottom: 0.5rem; color: #fecaca;">⚠️ Error</h3>
                    <p>${error.message}</p>
                </div>
            `;
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            setLoading(false, button, type);
        }
    }

    // Copy to clipboard logic (unchanged)
    copyBtn.addEventListener('click', () => {
        const textToCopy = explanationContent.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    function setLoading(isLoading, button, type) {
        if (isLoading) {
            button.disabled = true;
            button.querySelector('span:first-child').textContent = type === 'repo' ? 'Scanning Repo...' : 'Analyzing...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.querySelector('span:first-child').textContent = type === 'repo' ? 'Analyze Repo' : 'Humanize Code';
            button.classList.remove('loading');
        }
    }
});
