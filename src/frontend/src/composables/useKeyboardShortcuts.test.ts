import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let wrapper: any;

  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("should register keyboard shortcuts", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "n",
            ctrl: true,
            handler,
            description: "Test shortcut",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Ctrl+N
    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should handle Ctrl+S shortcut", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "s",
            ctrl: true,
            handler,
            description: "Save",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Ctrl+S
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });

    // Prevent default should be called
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should handle Escape key", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "Escape",
            handler,
            description: "Close dialog",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Escape
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should handle Ctrl+Shift+C shortcut", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "c",
            ctrl: true,
            shift: true,
            handler,
            description: "Copy",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Ctrl+Shift+C
    const event = new KeyboardEvent("keydown", {
      key: "c",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should not trigger handler when modifier keys do not match", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "n",
            ctrl: true,
            handler,
            description: "Test",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate just 'n' without Ctrl
    const event = new KeyboardEvent("keydown", {
      key: "n",
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle multiple shortcuts", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "n",
            ctrl: true,
            handler: handler1,
            description: "New",
          },
          {
            key: "s",
            ctrl: true,
            handler: handler2,
            description: "Save",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Ctrl+N
    let event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    // Simulate Ctrl+S
    event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should clean up event listeners on unmount", () => {
    const handler = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "n",
            ctrl: true,
            handler,
            description: "Test",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);
    wrapper.unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should handle case-insensitive key matching", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "N",
            ctrl: true,
            handler,
            description: "Test",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Ctrl+n (lowercase)
    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should support meta key (Cmd on Mac)", () => {
    const handler = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          {
            key: "s",
            ctrl: true,
            handler,
            description: "Save",
          },
        ]);
        return () => null;
      },
    });

    wrapper = mount(TestComponent);

    // Simulate Cmd+S (metaKey instead of ctrlKey)
    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
