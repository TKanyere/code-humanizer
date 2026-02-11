# Code Humanizer ✨

Describes complex code in plain English using the Gemini API.

## Setup

1.  **Install Dependencies** (if running locally):
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    -   Create a `.env` file in the root.
    -   Add your Gemini API Key:
        ```
        GEMINI_API_KEY=your_api_key_here
        ```

3.  **Run Locally** (requires Netlify CLI):
    ```bash
    netlify dev
    ```

## Deployment (Netlify)

1.  Push this folder to a GitHub repository.
2.  Log in to Netlify and "New Site from Git".
3.  Select the repository.
4.  **Important**: In Netlify "Site settings" > "Environment variables", add:
    -   Key: `GEMINI_API_KEY`
    -   Value: `your_actual_gemini_api_key`
5.  Deploy!
