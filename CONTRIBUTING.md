# Contributing to Productivholic 🚀

First off, thank you for considering contributing to Productivholic! Whether you are joining us for the Social Summer of Code 2026 or just looking to collaborate on a cool productivity tool, this document will help you get your local environment set up so you can start shipping code.

## Tech Stack
* **Framework:** Next.js 14 (App Router)
* **Styling:** TailwindCSS
* **Backend & Auth:** Supabase
* **Realtime:** Supabase Channels & `@monaco-editor/react`
* **AI Provider:** Google Gemini API

## Local Setup

1. **Fork & Clone**
   Fork the repository to your own GitHub account, then clone it to your local machine.
   ```bash
   git clone [https://github.com/YOUR_USERNAME/productivholic.git](https://github.com/YOUR_USERNAME/productivholic.git)
   cd productivholic
    ```
2.**Install Dependencies**
```bash
npm install
```
3.**Environment Variables**
Create a .env.local file in the root directory and add your keys:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```
(Note: You will need to spin up a free Supabase project and grab a free Gemini API key to test locally).
4.Run the Development Server
```bash
npm run dev
```
Open http://localhost:3000 with your browser to see the result.
Branching Strategy
1.Create a new branch for every feature or bug fix: git checkout -b feature/your-feature-name or bugfix/issue-description.
2.Ensure your code matches the existing style (we use Prettier and ESLint).
3.Write clear, descriptive commit messages.

Submitting a Pull Request
1.Push your branch to your fork.
2.Open a Pull Request against our main branch.
3.Link the issue your PR solves in the description (e.g., "Fixes #12").

And here is the **`.github/ISSUE_TEMPLATE/bug_report.md`** file, kept separate so it doesn't render inside your contributing guide:

```markdown
---
name: Bug report
about: Create a report to help us improve Productivholic
title: "[BUG] "
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - OS: [e.g. macOS, Windows, Linux]
 - Browser: [e.g. Chrome, Safari]
 - Version: [e.g. 22]

```

