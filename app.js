document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('codeInput');
    const humanizeBtn = document.getElementById('humanizeBtn');
    const resultArea = document.getElementById('resultArea');
    const explanationContent = document.getElementById('explanationContent');
    const copyBtn = document.getElementById('copyBtn');

    humanizeBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) {
            alert('Please paste some code first!');
            return;
        }

        // UI Loading State
        setLoading(true);

        try {
            const response = await fetch('/.netlify/functions/humanize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to humanize code');
            }

            // Render Markdown
            explanationContent.innerHTML = marked.parse(data.explanation);

            // Show Result
            resultArea.classList.remove('hidden');

            // Smooth scroll to result
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    });

    // Copy to clipboard
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

    function setLoading(isLoading) {
        if (isLoading) {
            humanizeBtn.disabled = true;
            humanizeBtn.querySelector('span:first-child').textContent = 'Analyzing...';
            humanizeBtn.classList.add('loading');
        } else {
            humanizeBtn.disabled = false;
            humanizeBtn.querySelector('span:first-child').textContent = 'Humanize Code';
            humanizeBtn.classList.remove('loading');
        }
    }
});
