import { onMounted, onUnmounted } from "vue";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const ctrlMatch =
        shortcut.ctrl === undefined ||
        shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const altMatch =
        shortcut.alt === undefined || shortcut.alt === event.altKey;
      const shiftMatch =
        shortcut.shift === undefined || shortcut.shift === event.shiftKey;
      const metaMatch =
        shortcut.meta === undefined || shortcut.meta === event.metaKey;
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();

      if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }
  };

  onMounted(() => {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("keydown", handleKeyDown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("keydown", handleKeyDown);
    }
  });

  return {
    shortcuts,
  };
}
