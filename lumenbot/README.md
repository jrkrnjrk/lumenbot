# Lunar Discord Bot

Modern Discord bot with verification, modmail, moderation, reaction roles, waitlist system and a web dashboard.

## Features

- **Roblox Verification** – Code-in-bio system (no cookie needed)
- **Modmail** – DM the bot to open a ticket
- **Moderation** – kick, ban, softban, purge, slowmode, setnickname
- **Reaction Roles** – classic reactions + buttons
- **Waitlist** – bot only stays in approved servers
- **Web Dashboard** – Discord OAuth login, per-server settings
- **Docker** ready

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
cp .env.example .env
nano .env   # fill in your values
```

### 2. Start with Docker

```bash
docker compose up --build -d
docker compose exec bot node src/deploy-commands.js
```

### 3. Invite the bot

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

### 4. Allow your server

```
/allow-server guildid:YOUR_SERVER_ID
```

### 5. Dashboard

Open `http://localhost:3000` (or your VPS IP) and log in with Discord.

## Environment Variables

See `.env.example` for all options.

## Hosting on a VPS (Oracle, etc.)

1. Install Docker
2. Clone the repo
3. Set `DISCORD_REDIRECT_URI` to `http://YOUR_PUBLIC_IP:3000/auth/discord/callback`
4. Open port 3000 in the cloud firewall
5. Add the same redirect URI in the Discord Developer Portal
6. `docker compose up --build -d`

## Commands

| Category | Commands |
|----------|----------|
| Verification | `/verify` `/verification-message` `/unlink` `/forceverify` |
| Moderation | `/kick` `/ban` `/softban` `/purge` `/slowmode` `/setnickname` |
| Reaction Roles | `/reactionroleadd` `/reactionroledelete` `/reactionrolebuttonadd` |
| Modmail | `/modmail-close` `/modmail-ban` |
| Staff | `/allow-server` `/disallow-server` `/leave-server` `/dashboard-add` |

## License

MIT
