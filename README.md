# SignalShield

SignalShield is a cross-browser filtering project for hiding unwanted YouTube and Google Search content with a shared rule engine.

## Goals

- Hide YouTube channels and videos unless they are on an allowlist
- Hide Google Search results that point to blocked YouTube content
- Keep one shared rule model for desktop-first filtering
- Leave room for sync and mobile fallbacks later

## Project Layout

- `packages/core`: shared rule engine and types
- `packages/extension`: Brave/Chromium extension shell

## Current Status

This repository currently contains the foundation for:

- rule evaluation
- query and YouTube URL parsing
- extension manifest
- YouTube and Google content script entry points
- options page scaffold with JSON-based rule editing
- guided exception editor and JSON file import for rules
- first-class support for own channels and own video seeds
- similarity-based own-video matching for YouTube and Google candidates
- build script that emits a loadable extension into `dist/`

## Next Steps

1. Implement stronger YouTube DOM extraction
2. Add Google result classification and hiding
3. Add settings persistence polish and guided exception editing
4. Add rule import from file and packaged release flow

## Local Development

```bash
npm install
npm run build
```

The unpacked extension output is written to `dist/`.
