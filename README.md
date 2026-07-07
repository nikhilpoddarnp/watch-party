# YouTube Watch Party

A real-time synchronized YouTube watch party app. Multiple users join a room and watch a video together — when the host or a moderator plays, pauses, seeks, or changes the video, everyone in the room sees the same action instantly.

**Live URL:** https://watch-party-ten-alpha.vercel.app

**Backend URL:** https://watch-party-j0jw.onrender.com

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Realtime | Socket.IO |
| Video | YouTube IFrame Player API |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Features

- Create a room (creator becomes Host) or join an existing room via room code
- Real-time playback sync — play, pause, seek, and change video across all participants
- Role-based access control: **Host**, **Moderator**, **Participant**
  - Host has full control: playback, assigning roles, removing participants
  - Moderator can control playback (play/pause/seek/change video)
  - Participant can only watch — no playback controls shown or accepted
- Backend validates every playback/role action server-side — the frontend UI hiding controls is a UX convenience, not the actual security boundary
- Automatic host reassignment if the current host disconnects
- Time interpolation so users who join mid-video land at the correct current timestamp, not a stale one
- Custom play/pause/seek UI (YouTube's native controls are disabled) so controls can be restricted per role

---

## Setup & Run Locally

### Backend
```bash
cd backend
npm install
npm run dev
```
Runs on `http://localhost:5000`. Requires a `.env` file:
```
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`. Requires a `.env` file:
```
VITE_BACKEND_URL=http://localhost:5000
```

Open two browser tabs at `http://localhost:5173` to test multi-user sync locally.

---

## Architecture Overview

**How WebSockets integrate with the flow:**

The app uses two long-lived servers communicating over a persistent WebSocket connection (via Socket.IO), rather than typical request/response REST calls:

1. **Room state lives in backend memory** — each room is an object holding the host's socket ID, current video state (`videoId`, `playState`, `currentTime`, `lastUpdatedAt`), and a map of participants with their roles.

2. **Every playback action follows the same pattern:**
   - Client emits an event (`play`, `pause`, `seek`, `change_video`)
   - Backend checks the sender's role (`hasPlaybackPermission` / `isHost`) before doing anything
   - If authorized, backend updates its in-memory room state and broadcasts `sync_state` to **everyone** in that room (including the sender), so the server's state is always the single source of truth
   - Each client's `VideoPlayer` component receives `sync_state` and programmatically drives the YouTube player (`playVideo()`, `pauseVideo()`, `seekTo()`) to match

3. **Feedback loop prevention:** since calling `playVideo()`/`pauseVideo()` on the player also fires YouTube's own `onStateChange` event, a guard flag (`isRemoteUpdate`) distinguishes "this state change came from the server" vs. "this state change came from a real user click" — without it, every sync would immediately re-emit back to the server in an infinite loop.

4. **Late joiners get interpolated time**, not a stale snapshot — the backend calculates elapsed time since the last state update (`Date.now() - lastUpdatedAt`) so someone joining mid-playback lands at approximately the correct current second, not wherever the video was when it was last explicitly paused/played.

5. **Role enforcement happens only on the backend** — the frontend hides controls for Participants as a UX nicety, but every single privileged event (`play`, `pause`, `seek`, `change_video`, `assign_role`, `remove_participant`) is independently re-validated server-side against the sender's actual role stored in room state. A client can never grant itself permissions by manipulating its own UI.

---

## Known Trade-offs / Issues

- Room state is stored in-memory only — a backend restart clears all active rooms. Acceptable for this assignment's scope; a production version would persist rooms to a database (Postgres/MongoDB) as noted as optional in the spec.
- Render's free tier spins down on inactivity, so the first connection after idle time may take 20-30 seconds (cold start) before the WebSocket connects.
- Host reassignment on disconnect picks the next available participant arbitrarily (first in the list), not by seniority or an explicit host vote.

---

## Code Walkthrough Readiness

Happy to walk through:
- How Socket.IO rooms (`socket.join`) are used to scope broadcasts to a single watch party
- The role-based permission checks (`hasPlaybackPermission`, `isHost`) and where they're enforced
- The feedback-loop guard in the YouTube player integration
- Deployment setup: separate CORS-linked env vars (`FRONTEND_URL` on backend, `VITE_BACKEND_URL` on frontend) and why WebSocket apps need a persistent-server host (Render) rather than serverless for the backend
