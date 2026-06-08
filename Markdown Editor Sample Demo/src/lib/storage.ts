export const STARTER_MARKDOWN = `# Today

- [ ] Review the editor behavior
- [ ] Test slash commands
- [x] Keep storage as Markdown

## Scratch

Use \`/\` to create blocks.

> Keep the editor simple. Complexity is where nice apps go to die.

\`\`\`ts
const storage = "markdown";
\`\`\`

---`;

const STORAGE_KEY_PREFIX = "block_editor_demo_";

export function loadFromStorage(key: string, defaultValue: string = STARTER_MARKDOWN): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (stored !== null) {
      return stored;
    }
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
  }
  return defaultValue;
}

export function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, value);
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + key);
  } catch (error) {
    console.error("Failed to remove from localStorage:", error);
  }
}
