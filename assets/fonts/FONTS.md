# Hypex IDE — Required Fonts

Place the following font files in this directory before building:

| File                       | Source                                         |
|----------------------------|------------------------------------------------|
| SpaceMono-Regular.ttf      | https://fonts.google.com/specimen/Space+Mono   |
| SpaceMono-Bold.ttf         | https://fonts.google.com/specimen/Space+Mono   |

These are used for the code editor, terminal, and git diff views.
App.tsx loads them via `expo-font` at startup and falls back to
the system monospace font if the files are missing.
