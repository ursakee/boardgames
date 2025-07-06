# Board Game Hub

A web-based, real-time multiplayer board game platform. This hub allows friends to jump in and play classic and modern board games directly in their browser.

The core of the experience is peer-to-peer connectivity using **WebRTC**, which ensures low-latency gameplay. Firebase is used only as a signaling server to help players find and connect to each other. Once the connection is established, all game data is sent directly between the players' browsers.

## ✨ Features

- **Visual Game Menu**: A simple, clickable grid of games on the landing page.
- **Link-Based Lobbies**: Create a game room and share a unique link to invite friends instantly.
- **No Accounts Needed**: Just enter a username and start playing.
- **Real-Time & Peer-to-Peer**: Ultra-fast gameplay using WebRTC for direct P2P connections.
- **Dynamic Lobbies**: See players join and change their names in real-time.
- **Graceful Disconnects**: Handles players leaving or closing their tabs, returning the room to a lobby state.
- **Scalable by Design**: A clean and organized project structure makes it incredibly easy to add new games.
- **Session Score Tracking**: Scores are kept for the duration of the session across multiple rounds.
