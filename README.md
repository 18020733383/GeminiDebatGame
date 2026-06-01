# Gemini AI 辩论赛 | Gemini AI Debate Arena

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-blue?logo=tailwindcss)](https://tailwindcss.com/) [![Gemini API](https://img.shields.io/badge/Gemini_API-@google/genai-orange)](https://ai.google.dev/docs/gemini_api_overview)

---

**Gemini AI 辩论赛**是一款由 Google Gemini AI 驱动的互动辩论应用程序。用户可以设定辩论主题，选择观看两位 AI 辩手（正方与反方）展开激烈的思想交锋（AI vs. AI 模式），或者亲自披挂上阵，在“人机对战”模式中与 AI 一较高下（Human vs. AI 模式）。应用内置 AI 评委功能，能对辩论过程进行深度分析、多维度打分和总结。此外，用户可以将完整的辩论记录（包括所有发言和评委点评）导出为 Markdown 文件，方便复盘和分享。

---

## 截图展示

主界面   
![image](https://github.com/user-attachments/assets/dce6199f-fcc9-4315-8946-bcefd1b4f1b2)   

辩论界面   
![image](https://github.com/user-attachments/assets/dc587aa5-97c0-4f28-8a72-f1007a75f193)   

评委打分   
![image](https://github.com/user-attachments/assets/b5926df9-6583-4abc-88dd-d6110e0082f0)   

md导出   
![image](https://github.com/user-attachments/assets/3b278bb3-827a-4559-99c1-a6589d6390b5)   

---

## 目录

- [主要特性](#主要特性)
- [技术栈](#技术栈)
- [如何使用](#如何使用)
- [API 密钥](#api-密钥)
- [未来展望](#未来展望-可选)

---

## 主要特性 (Features)

🇨🇳 **中文特性：**

* 🧠 **AI 驱动辩论**: 利用强大的 Google Gemini AI (gemini-2.5-flash-preview-04-17 模型) 生成富有逻辑和说服力的辩论内容。
* ⚔️ **双模式对战**:
    * 🤖 **AI vs. AI**: 设定主题后，观看两位 AI 辩手（正方、反方）自动进行多轮辩论。
    * 👤 **人机对战**: 用户扮演正方辩手，与 AI 反方进行辩论。
* ⚖️ **AI 评委**:
    * **多轮总结**: AI 评委对辩论的每一完整回合进行犀利总结。
    * **整体点评**: 对整场辩论的策略、表现进行全面深入的分析。
    * **维度化评分**: 从内容与论证、表达与技巧、反应与应变、气场四个维度为双方打分。
* 📜 **历史记录管理**:
    * **自动保存**: 当点击“退出并保存”时，如果当前辩论有内容，该场辩论将自动保存到历史记录中。
    * **查看历史**: 在主菜单通过“查看历史辩题”按钮，可以浏览所有已保存的辩论。
    * **历史卡片**: 每条历史记录以卡片形式展示，包含辩题、创建时间、对战模式和评委点评状态。
    * **加载记录**: 点击历史卡片上的“加载记录”按钮，可以重新载入该场辩论的详细内容（包括发言和评委点评），方便回顾、重新获取评委点评或下载 Markdown 文件。加载后的历史辩论是只读状态，不能继续进行新的辩论回合。
    * **删除记录**: 可以从历史记录中删除指定的辩论。
* 📊 **Token 消耗追踪**: 实时显示 Token 使用情况，包括：
    * **本次消耗**: 显示最近一次 API 调用（AI发言或评委点评）所消耗的 Prompt Token、Completion Token 及总 Token 数量。
    * **共消耗**: 显示当前整场辩论累积消耗的 Prompt Token、Completion Token 及总 Token 数量。
* 📝 **自定义主题**: 用户可自由设定辩论题目（最长1000字符）。
* 🗣️ **用户发言**: 在人机对战模式中，用户可以输入自己的论点（最长1000字符）。
* 💾 **Markdown 导出**: 一键下载包含所有发言、时间戳、完整 AI 评委点评以及Token使用情况的 Markdown 文件。
* 🔑 **API 密钥管理**:
    * 支持用户输入并保存在浏览器本地的 Google Gemini API 密钥。
    * 若用户未提供，则尝试使用应用内置的 `process.env.API_KEY` (如果配置)。
* ✨ **现代 UI/UX**: 基于 React, TypeScript, 和 Tailwind CSS 构建，提供流畅、美观且响应式的用户体验。
* 🔄 **退出并保存/返回主菜单**:
    * 在进行新辩论时，按钮显示为“退出并保存”。点击后，若辩论有内容，则自动存入历史记录，并返回主选择界面。
    * 在查看历史记录时，按钮显示为“返回主菜单”。点击后直接返回主选择界面。
* 🚫 **错误提示**: 提供友好的错误信息反馈。

🇬🇧 **English Features:**

* 🧠 **AI-Powered Debates**: Leverages the powerful Google Gemini AI (gemini-2.5-flash-preview-04-17 model) to generate logical and persuasive debate content.
* ⚔️ **Dual Debate Modes**:
    * 🤖 **AI vs. AI**: Set a topic and watch two AI debaters (Pro & Con) automatically engage in multiple rounds of debate.
    * 👤 **Human vs. AI**: Users play as the Pro debater against an AI Con debater.
* ⚖️ **AI Judge**:
    * **Round Summaries**: The AI judge provides sharp summaries for each complete round of the debate.
    * **Overall Analysis**: Delivers a comprehensive and in-depth analysis of strategies and performance throughout the debate.
    * **Dimensional Scoring**: Scores both sides on four dimensions: Content & Argumentation, Expression & Technique, Reaction & Adaptability, and Presence.
* 📜 **Topic History Management**:
    * **Auto-Save**: Debates with content are automatically saved to history when "Exit and Save" is clicked.
    * **View History**: Access all saved debates via the "View Topic History" button on the main menu.
    * **History Cards**: Each historical entry is displayed as a card showing the topic, creation date, game mode, and judge commentary status.
    * **Load History**: Load a past debate's details (log, judge comments) for review, re-judging, or Markdown export. Loaded historical debates are read-only for new turns.
    * **Delete History**: Remove specific debates from the history.
* 📊 **Token Usage Tracking**: Real-time display of token usage, including:
    * **Current Call**: Shows Prompt Tokens, Completion Tokens, and Total Tokens consumed by the most recent API call (AI turn or judge's comments).
    * **Total Session**: Shows the cumulative Prompt Tokens, Completion Tokens, and Total Tokens consumed throughout the current debate session.
* 📝 **Custom Topics**: Users can freely set their own debate topics (up to 1000 characters).
* 🗣️ **User Arguments**: In Human vs. AI mode, users can input their own arguments (up to 1000 characters).
* 💾 **Markdown Export**: One-click download of a Markdown file containing all arguments, timestamps, the complete AI judge's commentary, and total token usage information for the session.
* 🔑 **API Key Management**:
    * Supports user-provided Google Gemini API keys, saved locally in the browser.
    * Attempts to use an app-embedded `process.env.API_KEY` if available and no user key is provided.
* ✨ **Modern UI/UX**: Built with React, TypeScript, and Tailwind CSS, offering a smooth, aesthetically pleasing, and responsive user experience.
* 🔄 **Exit and Save / Return to Main Menu**:
    * During an active new debate, the button reads "Exit and Save". Clicking it saves the debate (if it has content) to history and returns to the main selection screen.
    * When viewing a historical debate, the button reads "Return to Main Menu". Clicking it returns to the main selection screen.
* 🚫 **Error Feedback**: Provides user-friendly error messages.

---

## 技术栈 (Tech Stack)

* **前端 (Frontend)**:
    * [React](https://react.dev/) (v19)
    * [TypeScript](https://www.typescriptlang.org/)
    * [Tailwind CSS](https://tailwindcss.com/)
    * [React Markdown](https://github.com/remarkjs/react-markdown) (for rendering Markdown content)
    * [Remark GFM](https://github.com/remarkjs/remark-gfm) (GitHub Flavored Markdown support)
* **AI (Artificial Intelligence)**:
    * [Google Gemini API](https://ai.google.dev/docs/gemini_api_overview) via `@google/genai` SDK
    * Model: `gemini-2.5-flash-preview-04-17`
* **存储 (Storage)**:
    * Browser `localStorage` (for API key and debate history)

---

## 本地部署
```bash
npm install
npm run dev
````

## 如何使用 (How to Use)

1.  **选择模式或查看历史 (Select Mode or View History)**:
    * 打开应用后，您可以选择辩论模式：“AI vs. AI” 或 “人机对战”。
    * 或者，点击“📜 查看历史辩题”按钮来浏览、加载或删除之前保存的辩论。
    * 您也可以点击 "⚙️ 设置 API 密钥" 来配置您自己的 Google Gemini API 密钥。
2.  **设定辩题 (Set Topic)**:
    * 如果开始新辩论，输入您感兴趣的辩论题目。
    * 点击“开始辩论”。
3.  **进行辩论 (Engage in Debate)**:
    * **AI vs. AI**: 点击“请 XX 发言”按钮，AI 将轮流进行辩论。
    * **Human vs. AI**: 当轮到您发言时，在输入框中输入您的论点，然后点击“提交发言”。AI 将在您发言后进行回应。
    * 辩论过程中，界面左下角会实时显示**本次 API 调用**和**整场辩论**已消耗的 Token 数量。
4.  **获取点评 (Get Judge's Comments)**:
    * 在辩论进行中或结束后（至少有一方发言后），点击“评委点评”按钮。AI 评委将分析辩论并给出总结和评分。
    * 对于从历史记录加载的辩论，您也可以使用此功能获取新的点评或查看已有的点评。
5.  **下载记录 (Download Log)**:
    * 点击“下载 .md”按钮，可以将整场辩论（包括评委点评和总Token消耗情况）保存为 Markdown 文件。此功能也适用于从历史加载的辩论。
6.  **退出并保存 / 返回主菜单 (Exit and Save / Return to Main Menu)**:
    * 在进行新辩论时，点击“退出并保存”按钮。如果当前辩论有实际内容，它将被自动保存到历史记录中。之后，界面将清空当前辩论内容和Token计数，返回初始设置界面。
    * 如果正在查看历史记录加载的辩论，此按钮会变为“返回主菜单”，点击后将返回主菜单。

---

## API 密钥 (API Key)

* 此应用允许用户使用自己的 Google Gemini API 密钥。
* 在应用初始界面，点击 "⚙️ 设置 API 密钥" 按钮。
* 在输入框中粘贴您的密钥并点击“保存密钥”。密钥将存储在您浏览器的 `localStorage` 中，仅供您本地使用。
* 如果您清除了用户密钥或未设置，应用将尝试使用通过 `process.env.API_KEY` 配置的内置 API 密钥（如果开发者已配置）。
* **强烈建议使用您自己的 API 密钥**，以确保服务的可用性和您个人配额的使用。您可以从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取 API 密钥。

---

## 未来展望 (Future Enhancements - Optional)

* [ ] 支持用户选择扮演反方。
* [ ] 更多自定义 AI 角色和辩论风格。
* [ ] 辩论历史记录手动保存/命名功能。
* [ ] 国际化支持 (i18n)。
* [ ] 支持更多模型（期待deepseek的表现😋）
* [ ] 内容折叠（节省token）
* [ ] 布局适应
* [ ] 后端（热门话题，云端存储，登录等等功能🤔还有很多可拓展空间）

---

希望您喜欢这款 Gemini AI 辩论赛应用！欢迎提出宝贵意见和建议。😁




https://vsllm.com

