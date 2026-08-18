# Advanced Discord + Roblox Bot

Full-featured Discord bot with:

- **Roblox Group Management**: `/rank`, `/exile`, `/promote`, `/demote`, `/terminate`, `/announce`, `/join`, `/leave`
- **Roblox Verification**: `/verify`, `/verification-message`, `/unlink`, `/forceverify`
- **Moderation**: `/kick`, `/ban`, `/softban`, `/purge`, `/slowmode`, `/setnickname`
- **Reaction Roles**: classic + button-based
- **Modmail**: DM → ticket system with close/ban
- **Waitlist system**: Bot only stays in approved servers
- **Web Dashboard**: Discord OAuth login, per-server plugin toggles, modmail & DM-before-mod settings
- **Docker + MySQL**

---

## Requirements (Mac)

- [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) (recommended)
- Or Node.js 20+ and a local MySQL if you prefer not to use Docker

---

## Quick Start with Docker (Recommended)

1. **Unzip** the project and open a terminal in the folder:
   ```bash
   cd discord-bot
   ```

2. **Copy the environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** with your real values:
   - Create a Discord Application + Bot at https://discord.com/developers/applications
   - Enable **Message Content Intent**, **Server Members Intent**, **Presence Intent** (optional)
   - Copy Bot Token → `DISCORD_TOKEN`
   - Copy Application ID → `DISCORD_CLIENT_ID`
   - Create OAuth2 redirect: `http://localhost:3000/auth/discord/callback` and put Client Secret
   - Get a Roblox account cookie that has ranking permissions in your group (use a browser extension or network tab carefully)
   - Set `OWNER_IDS` to your Discord user ID(s)
   - Optionally set `PRE_WAITLISTED_GUILDS` with server IDs you want the bot to stay in immediately

4. **Start everything**:
   ```bash
   docker compose up --build -d
   ```

5. **Register slash commands** (run once):
   ```bash
   docker compose exec bot node src/deploy-commands.js
   ```

6. **Invite the bot** to a server using this URL (replace CLIENT_ID):
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

7. **Allow the server**:
   ```
   /allow-server guildid:YOUR_SERVER_ID
   ```
   (or put the ID in `PRE_WAITLISTED_GUILDS` and restart)

8. **Dashboard**: open http://localhost:3000  
   Login with Discord. Only users in `OWNER_IDS` or added via `/dashboard-add` can access it.

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `/allow-server` | Add server to waitlist (owner) |
| `/disallow-server` | Remove + leave |
| `/dashboard-add` | Give someone dashboard access |
| `/rank` `/promote` `/demote` `/terminate` `/exile` | Roblox ranking |
| `/verify` `/forceverify` `/unlink` | Verification |
| `/kick` `/ban` `/softban` `/purge` | Moderation |
| `/reactionrolebuttonadd` | Create button role menu |
| `/modmail-close` | Close a ticket |

---

## Modmail Flow

1. User DMs the bot → bot asks if they want a ticket
2. User clicks ✅ → ticket channel is created under the “Modmail” category
3. Messages are relayed both ways
4. Staff runs `/modmail-close` → channel deleted, user notified

---

## Notes & Limitations

- Roblox ranking requires a valid `.ROBLOSECURITY` cookie of an account that can rank in the group. Treat it like a password.
- Verification currently uses a simple code-in-bio flow (expandable to full OAuth).
- Plugin toggles in the dashboard currently store the setting; full command gating can be extended in `interactionCreate.js`.
- For production, put the dashboard behind HTTPS and change all secrets.

---

## Development without Docker

```bash
# Terminal 1 – MySQL (or use Docker only for MySQL)
# Terminal 2
cd bot && npm install && node src/deploy-commands.js && npm start

# Terminal 3
cd dashboard && npm install && npm start
```

---

Enjoy! If you need more features (logging channels, advanced verification OAuth, multi-group support, etc.) just ask.
