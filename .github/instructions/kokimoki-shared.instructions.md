---
description: Documentation for the @kokimoki/shared library components and hooks.
applyTo: '**/*.tsx'
---

# Shared Components Library: @kokimoki/shared

A React components library providing reusable UI components and hooks for Kokimoki applications.

## General guidelines

- Import components or hooks from the shared library `@kokimoki/shared`
- Components like `KmAudioButton` require their provider (`KmAudioProvider`) to be wrapped at app root
- Use `playAudio` for playing background music, `playSound` for one-shot effects

## Providers

Wrap at app root, order doesn't matter

### KmAudioProvider

- Use for background/ambient music, sound effects
- Accessible via context hook `useKmAudioContext()`
- Supports audio preloading and background playback controls

### KmConfettiProvider

- Use for celebrations, achievements, game endings
- Trigger confetti animations
- Accessible via context hook `useKmConfettiContext()`

### KmModalProvider

- Use for dialogs, confirmation prompts (alert dialog), bottom sheets (drawer)
- Accessible via context hook `useKmModal()`

## Components

### KmAudioButton

- Use for user-controlled background audio toggle
- Play/pause toggle (requires `KmAudioProvider`)

### KmCopyButton

- Use for sharing links, copying codes/IDs
- Copy to clipboard with visual feedback

### KmQrCode

- Use for game join links, sharing URLs on presenter screen
- Interactive QR code with resize/copy controls

### KmPodiumTable

- Use for game results, leaderboards, winner displays
- Top 3 ranked entries display (auto-sorted by points)

### KmTimeCountdown

- Use for round timers, countdowns, time displays
- Time display in various formats

### KmTimeProgress

- Use for round progress, time remaining visualization
- Progress bar for time tracking

## Hooks

### useKmAnimatedValue

- Use for score animations, counter effects, smooth number transitions
- Animate numeric values with smooth DOM updates

## Full Documentation

**IMPORTANT:** Refer to [`@kokimoki/shared/dist/docs/llms.txt`](../../../node_modules/@kokimoki/shared/dist/docs/llms.txt) for detailed props, examples, and API reference.
