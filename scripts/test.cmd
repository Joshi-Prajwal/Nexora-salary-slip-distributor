@echo off
echo Running TypeScript Typecheck and Unit Tests...
call npx tsc --noEmit
call npm run test
call cargo check --manifest-path src-tauri/Cargo.toml
