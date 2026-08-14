#!/usr/bin/env bash
echo "Running TypeScript Typecheck and Unit Tests..."
npx tsc --noEmit
npm run test
cargo check --manifest-path src-tauri/Cargo.toml
