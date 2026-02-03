<div align="center">
  <h1>Content Pilot</h1>
  <p><strong>AI-Powered Social Media Automation</strong></p>
</div>

---

## About the Project

This project was inspired by a very common problem in organic marketing: **everyone knows consistency matters, but very few people can maintain it.**

Most marketers, founders, and content creators understand that organic growth is a long-term game. Posting regularly builds trust, reach, and compounding visibility over time. However, in reality, content publishing is often manual, fragmented, and easy to drop when workload increases. After missing posts, breaking schedules, and constantly "catching up," organic growth quietly stalls.

**Content Pilot** solves that problem at the system level—automating content creation and publishing while maintaining quality and authenticity.

---

## 🚀 Features

* **Visual Flow-Based Content Creation:** Design content workflows with an intuitive drag-and-drop interface
* **AI-Powered Content Generation:** Leverage Gemini 2.5 Flash for intelligent, context-aware content
* **Automatic Image Generation:** Create visuals with Imagen 3.0 that match your content
* **Twitter/X OAuth 2.0 Integration:** Seamless authentication and publishing
* **Automated Publishing:** Content is posted automatically—no manual intervention required
* **Session-Based Security:** Non-custodial approach, tokens never stored on frontend
* **Multi-Language Support:** Generate content in Vietnamese, English, and more

---

## 🎯 Core Objectives

* Make organic social media growth accessible without requiring expert knowledge
* Remove friction from repetitive content workflows
* Automate content creation and scheduling to maintain consistency
* Provide clear visibility into content generation and publishing
* Enable reliable, predictable execution over time

---

## 📦 Tech Stack

**Frontend:**
* Next.js / React 19 + TypeScript + Vite
* ReactFlow (visual flow editor)
* Google Generative AI (Gemini 2.5 Flash)
* Lucide React (icons)

**Backend:**
* Node.js + Express + TypeScript
* twitter-api-v2 (Twitter OAuth + API)
* express-session (session management)

**AI Models:**
* Gemini 2.5 Flash (content generation)
* Imagen 3.0 (image generation)

---

## 🛠️ Current Work

| Status | Feature                              |
| ------ | ------------------------------------ |
| ✅      | Visual workflow builder              |
| ✅      | AI content generation with Gemini    |
| ✅      | Image generation with Imagen         |
| ✅      | Twitter OAuth 2.0 authentication     |
| ✅      | Automatic tweet posting              |
| ✅      | Multi-language content support       |

---

## Roadmap

* [x] Core automation engine
* [x] Twitter/X integration
* [x] AI content generation
* [x] Image generation
* [ ] Multi-platform support (LinkedIn, Facebook)
* [ ] Content scheduling and calendar
* [ ] Analytics and performance tracking
* [ ] Content recycling and repurposing
* [ ] Team collaboration features
* [ ] Webhook integrations

---

## ⚡ Quick Start

### Prerequisites

* **Node.js** ≥ 18
* **npm** ≥ 10
* **Twitter Developer Account**
* **Gemini API Key**

Check your versions:

```bash
node -v
npm -v
```

### Clone the Repository

```bash
git clone <your-repo-url>
cd "2026 Gemini Hackathon"
```

---

### Environment Setup

Create `.env` files for both frontend and backend before running the app.

#### Frontend (`frontend/.env`)

```env
GEMINI_API_KEY=your_gemini_api_key_here
BACKEND_URL=http://localhost:3001
```

#### Backend (`backend/.env`)

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here
TWITTER_CALLBACK_URL=http://localhost:3001/auth/twitter/callback
SESSION_SECRET=your_random_secret_here
```

---

### Install Dependencies

#### Frontend

```bash
cd frontend
npm install
```

#### Backend

```bash
cd backend
npm install
```

---

### Start Development Servers

#### Backend

```bash
cd backend
npm run dev
```

Backend runs at `http://localhost:3001`

#### Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## 🔧 Twitter OAuth Configuration

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create new app or use existing
3. Configure User authentication settings:
   - **App permissions:** Read and Write
   - **Type of App:** Web App, Automated App or Bot
   - **Callback URL:** `http://localhost:3001/auth/twitter/callback`
   - **Website URL:** `http://localhost:3000`
4. Copy Client ID and Client Secret to `backend/.env`

---

## 📖 How to Use

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Click "Sign in with X" to authenticate with Twitter
4. Enter your content idea or topic
5. AI automatically generates content and images
6. Content is published to Twitter automatically
7. View your post directly on Twitter

---

## 🏗️ Project Structure

```
.
├── frontend/
│   ├── components/         # React components
│   │   ├── ModuleComponents.tsx  # Workflow modules
│   │   ├── CommandBar.tsx        # Input interface
│   │   └── FlowHeader.tsx        # Header component
│   ├── services/           # API services
│   │   ├── gemini.ts            # AI content generation
│   │   └── twitter.ts           # Twitter integration
│   ├── hooks/              # Custom React hooks
│   │   └── useFlowController.ts # Workflow logic
│   └── types.ts            # TypeScript definitions
│
└── backend/
    ├── src/
    │   ├── config/         # Configuration management
    │   ├── routes/
    │   │   ├── auth.ts            # OAuth routes
    │   │   └── twitter.ts         # Twitter API routes
    │   ├── types/          # TypeScript types
    │   └── server.ts       # Main server file
    ├── .env.example        # Environment template
    └── package.json
```

---

## 🔐 API Endpoints

### Authentication
* `GET /auth/twitter/login` - Initiate OAuth flow
* `GET /auth/twitter/callback` - OAuth callback
* `GET /auth/twitter/user` - Get current user
* `POST /auth/twitter/logout` - Logout user

### Twitter API
* `POST /api/twitter/tweet` - Post a tweet
* `GET /api/twitter/timeline` - Get user timeline
* `GET /api/twitter/search` - Search tweets

---

## 🐛 Troubleshooting

**Popup blocked:**
* Allow popups for localhost in browser settings

**Authentication failed:**
* Verify callback URL in Twitter Developer Portal matches exactly: `http://localhost:3001/auth/twitter/callback`
* Ensure App permissions are "Read and Write"
* Check credentials in `backend/.env`

**CORS error:**
* Ensure backend is running on port 3001
* Verify `FRONTEND_URL=http://localhost:3000` in backend `.env`
* Check `BACKEND_URL=http://localhost:3001` in frontend `.env`

**Content not posting:**
* Ensure you're authenticated with Twitter
* Check backend console for error messages
* Verify Twitter API credentials are valid

---

## 💡 What I Learned

While building this project, I learned that **automation is not about replacing marketers, but about removing friction from repetitive workflows.** Organic growth depends less on viral moments and more on predictable execution over time.

From a technical perspective, I learned how to:

* Design an AI-powered content generation system that maintains quality
* Build abstractions for multi-platform publishing without coupling platform logic
* Implement secure OAuth flows with session-based authentication
* Treat content as a lifecycle (ideation → generation → preview → publish)
* Create visual workflow builders that are intuitive for non-technical users

---

## 🎨 Design Philosophy

The system is structured around:

* **A core automation engine** that guarantees content is published reliably
* **A unified content model** that can adapt to different platforms
* **AI-driven generation** that allows marketers to focus on strategy instead of execution
* **Clear separation** between content logic, AI logic, and platform adapters

The goal was to make the system **boring in the best way possible**: predictable, reliable, and invisible once configured.

---

## 🚧 Challenges I Faced

The hardest part was not the UI or the posting itself, but handling edge cases at scale:

* Preventing duplicate posts when retries happen
* Managing API rate limits and quota restrictions
* Balancing AI creativity with brand consistency
* Designing automation that supports organic growth instead of gaming algorithms
* Implementing secure authentication without storing sensitive tokens on frontend

Another challenge was resisting feature creep. It was tempting to add analytics, A/B testing, or engagement hacks early on. I deliberately kept the scope focused on **consistent execution**, because without that foundation, nothing else matters.

---

## 🌟 Why This Project Matters

I believe **organic growth is undervalued** in a world obsessed with paid acquisition. This project reflects my belief that **good systems, executed consistently, outperform shortcuts over time.**

This is not just a tool I built—it is a workflow I personally wanted to use.

---

## 📄 License

MIT

---

**Content Pilot — Automate consistency, amplify growth.**
