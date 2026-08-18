CREATE DATABASE IF NOT EXISTS discordbot;
USE discordbot;

-- Guilds / waitlist
CREATE TABLE IF NOT EXISTS guilds (
  guild_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255),
  waitlisted BOOLEAN DEFAULT FALSE,
  modmail_enabled BOOLEAN DEFAULT TRUE,
  dm_before_mod BOOLEAN DEFAULT TRUE,
  plugins JSON DEFAULT ('{"roblox":true,"moderation":true,"reactionroles":true,"modmail":true,"verification":true}'),
  modmail_category_id VARCHAR(20) NULL,
  verified_role_id VARCHAR(20) NULL,
  emoji_success VARCHAR(100) NULL,
  emoji_error VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Discord <-> Roblox link)
CREATE TABLE IF NOT EXISTS users (
  discord_id VARCHAR(20) PRIMARY KEY,
  roblox_id VARCHAR(20) NULL,
  roblox_username VARCHAR(50) NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard access
CREATE TABLE IF NOT EXISTS dashboard_users (
  discord_id VARCHAR(20) PRIMARY KEY,
  username VARCHAR(100),
  added_by VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reaction roles
CREATE TABLE IF NOT EXISTS reaction_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  emoji VARCHAR(100) NOT NULL,
  role_id VARCHAR(20) NOT NULL,
  UNIQUE KEY unique_reaction (message_id, emoji)
);

-- Button reaction roles
CREATE TABLE IF NOT EXISTS button_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  custom_id VARCHAR(100) NOT NULL,
  role_id VARCHAR(20) NOT NULL,
  label VARCHAR(80) NOT NULL,
  style VARCHAR(20) DEFAULT 'PRIMARY',
  UNIQUE KEY unique_button (message_id, custom_id)
);

-- Modmail tickets
CREATE TABLE IF NOT EXISTS modmail_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL
);

-- Modmail bans (users who cannot open tickets)
CREATE TABLE IF NOT EXISTS modmail_bans (
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  reason TEXT,
  banned_by VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, user_id)
);

-- Roblox group settings per guild
CREATE TABLE IF NOT EXISTS roblox_groups (
  guild_id VARCHAR(20) PRIMARY KEY,
  group_id VARCHAR(20) NOT NULL,
  cookie TEXT NULL
);

-- Audit / logs (optional simple)
CREATE TABLE IF NOT EXISTS command_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20),
  user_id VARCHAR(20),
  command VARCHAR(50),
  args TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
