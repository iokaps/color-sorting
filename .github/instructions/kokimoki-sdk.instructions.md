---
description: Instructions for the Kokimoki SDK
applyTo: '**/*.tsx,**/*.ts'
---

# Kokimoki SDK

Development toolkit for building real-time collaborative game applications

## General guidelines

- `kmClient` - main entry point in Kokimoki SDK (defined in `src/services/km-client.ts`)
- `kmClient.id` - unique player identifier (persistent across connections)
- `kmClient.serverTimestamp` - synchronized server time (Unix epoch)

## Stores

### Features

- Define stores in `src/state/stores/`
- Use `kmClient.store` for global shared state
- Use `kmClient.localStore` for local device-specific state

### When to Use

- **Global store**: Real-time shared state (players, game state)
- **Local store**: Device-specific data (settings, draft inputs, UI state)

### State Updates

- Define actions in `src/state/actions/`
- **ALWAYS** use `useSnapshot(store.proxy)` hook for reactive state in React components
- Transactions via `kmClient.transact` are atomic state updates
- **ALWAYS** use `kmClient.transact` for global store updates

## Connections

- Track online players via `store.connections`
- Use `useSnapshot(store.connections)` for reactive connections updates

## Storage

### Features

- Use for media files (images, audio, video), large JSON data, files not suitable for real-time stores
- File upload/management via `kmClient.storage`
- No setup required

### When to Use

- Upload a file to storage via `kmClient.storage.upload`
- Query uploaded files with filtering and pagination via `kmClient.storage.listUploads`
- Update file tags via `kmClient.storage.updateUpload`
- Permanently delete files via `kmClient.storage.deleteUpload`

## AI Integration

- AI text/image generation via `kmClient.ai`
- No API keys required

### When to Use

- Generate text response (stories, explanations, summaries) via `kmClient.ai.chat`
- Generate structured JSON (quiz questions, game content) via `kmClient.ai.generateJson`
  - **CRITICAL**: The prompt must include the word "json"
  - **CRITICAL**: The required schema must be explicitly written in the prompt
- Transform images via `kmClient.ai.modifyImage`

## Leaderboard

### Features

- Leaderboard system via `kmClient.leaderboard`
- No setup required
- Storage for large number of players

### When to Use

- Large player counts (100+), persistent scores, efficient pagination
- Add new entry (creates new record each time) via `kmClient.leaderboard.insertEntry`
- Add or update latest entry per client (replaces previous) via `kmClient.leaderboard.upsertEntry`
- List entries with pagination via `kmClient.leaderboard.listEntries`
- Get best entry for a client via `kmClient.leaderboard.getBestEntry`

### When NOT to Use

- Small player counts (<100), real-time updates, session-based (use global stores instead)

## Full Documentation

**IMPORTANT:** Refer to [`@kokimoki/app/dist/llms.txt`](../../../node_modules/@kokimoki/app/dist/llms.txt) for detailed examples and complete API reference.
