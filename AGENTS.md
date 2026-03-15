# Hypex IDE - Agent Guidelines

Welcome, Agent. You are operating in **Hypex IDE**, a minimalist, iOS-style code editor for Android built with React Native and Expo. The app features a PRoot-based offline Linux container, Git integration, an extensions marketplace, and a built-in terminal emulator.

Please follow these guidelines meticulously to maintain high code quality and architectural consistency.

---

## 1. Build, Lint & Test Commands

**Dependencies:**
- `npm install --legacy-peer-deps` (Note: due to React Native 0.83+ and Expo 55, peer dependency overrides are sometimes necessary).

**Start the App:**
- `npx expo start` or `npm run start` (Run Expo dev server)
- `npx expo start --clear` (Clear Metro bundler cache)

**Type Checking:**
There is no separate linting script, but strict TypeScript checks are required.
- `npx tsc --noEmit` (Ensure this passes before committing code)

**Testing:**
We use `jest-expo` and React Native Testing Library.
- **Run all tests:** `npm test` (Runs `jest --watchAll`)
- **Run all tests (CI mode):** `npx jest --watchAll=false`
- **Run a single test file:** `npx jest path/to/file.test.ts`
  *(Example: `npx jest src/__tests__/container.test.ts`)*
- **Run a specific test case:** `npx jest path/to/file.test.ts -t "test name"`

---

## 2. Code Style & Architecture

### TypeScript & Typing
- **Strict Mode:** We use `"strict": true` in `tsconfig.json`. You must define proper types/interfaces. Do not use `any` unless absolutely unavoidable (use `unknown` and type guards instead).
- **Type Definitions:** Put domain-wide shared types in `src/types/index.ts`. Component-specific props should be defined in the same file as the component.
- **Imports/Exports:** Use named exports over default exports (except for React Native App entry points or screen root components).

### Path Aliases
Always use path aliases defined in `tsconfig.json` to prevent relative path hell:
- `@/*` -> `src/*`
- `@components/*` -> `src/components/*`
- `@screens/*` -> `src/screens/*`
- `@store/*` -> `src/store/*`
- `@hooks/*` -> `src/hooks/*`
- `@utils/*` -> `src/utils/*`
- `@theme/*` -> `src/theme/*`
- `@types/*` -> `src/types/*`

### React Native & UI
- **Styling:** Use `StyleSheet.create` for static styles. Use inline styles sparingly, and only for dynamic properties (e.g., calculated layout widths or Reanimated animated styles).
- **Design System:** Use colors, typography, and spacing from `src/theme/tokens.ts`. Respect the "iOS aesthetic" (clean whites/grays, glassmorphism, spring animations, haptic feedback).
- **Animations:** Use `react-native-reanimated`. Avoid React Native's legacy `Animated` API. Reusable animations live in `src/components/animations/`.
- **Haptics:** Use the utility functions in `src/utils/haptics.ts` for consistent tactile feedback on user actions.

### State Management (Zustand)
- We use Zustand (`src/store/*.ts`) for global state instead of Context or Redux.
- Break stores apart logically (e.g., `appStore`, `editorStore`, `terminalStore`).
- State mutation should be done inside the store actions, not in the React components.

### File System & External Operations
- **Storage:** Use `expo-file-system` wrapped by `src/services/FileSystemService.ts` for all I/O. Do not use raw React Native FS libraries directly.
- **Container/PRoot:** Interact with the Linux container strictly via `src/services/ContainerService.ts` and `src/container/HypexContainer.ts`.
- **Git:** Use `src/services/GitService.ts` for version control operations.

---

## 3. Naming Conventions

- **Files/Directories:** 
  - `PascalCase` for React components (`CodeEditor.tsx`, `HomeScreen.tsx`).
  - `camelCase` for utilities, hooks, stores, and services (`useTheme.ts`, `editorStore.ts`, `files.ts`).
- **Variables/Functions:** Use `camelCase`. Function names should be verb-noun pairs (e.g., `readFile`, `initializeContainer`).
- **Types/Interfaces:** Use `PascalCase` (e.g., `FileNode`, `ContainerStatus`). Do not prefix interfaces with `I`.
- **Constants:** Use `UPPER_SNAKE_CASE` (e.g., `MAX_TREE_DEPTH`, `STORAGE_KEYS`).

---

## 4. Error Handling & Best Practices

- **Graceful Degradation:** Use `try/catch` blocks around async operations, especially for FileSystem, Network, and PRoot operations.
- **Error Presentation:** Never silently swallow errors. If an error is actionable, show a UI alert (or log to the internal terminal). If it's a developer error, use `console.error` clearly.
- **Optional Chaining:** Use `?.` and `??` to prevent null-reference errors instead of deeply nested `if` checks.
- **Performance:** Use utilities in `src/utils/performance.ts` (`throttle`, `debounce`, `memoizeLast`) for high-frequency events (like editor scrolling or terminal output). Use `FlashList` instead of `FlatList` for long lists.
- **Platform Specifics:** Account for Android vs iOS differences using `Platform.OS`. Ensure Android `StatusBar` is translucent and UI elements respect safe area insets via `react-native-safe-area-context`.

---

## 5. Submitting Changes (Agent Workflow)

1. **Understand:** Read relevant codebase context (`src/types/index.ts`, stores, services) before modifying code.
2. **Plan:** Think step-by-step. If writing tests, do that first (TDD). 
3. **Execute:** Write clean, modular code following the rules above.
4. **Verify:** Run type checks (`npx tsc --noEmit`) and tests (`npx jest`) if you change logic. Verify lint/style compliance.
5. **Clean up:** Ensure no console.logs used for debugging remain in the final output unless requested or required for the internal terminal.
