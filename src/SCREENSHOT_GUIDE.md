# Screenshot Testing Guide

This guide explains how to capture screenshots of your Wails app for testing and debugging.

## Overview

The screenshot utility allows you to:

- Capture screenshots programmatically during tests
- Take on-demand screenshots for debugging UI issues
- Capture sequences of screenshots showing user interactions
- Test responsive behavior at different window sizes

## Prerequisites

1. **Chrome/Chromium** must be installed on your system
2. **Wails app must be running** (via `wails dev` or built binary)
3. **chromedp** Go package (already added to dependencies)

## Quick Start

### 1. Start Your Wails App

The screenshot tasks will automatically start the app if it's not running. You can also start it manually:

```bash
cd statli
wails dev
```

The app will typically run on `http://localhost:34115`

### 2. Take a Screenshot Using CLI Tool

```bash
# Automatically starts app and captures screenshot
task screenshot

# Or with custom options
./screenshot-tool \
  -url http://localhost:34115 \
  -output screenshots/my-view.png \
  -selector "#app" \
  -wait 2s \
  -width 1920 \
  -height 1080
```

### 3. Run Screenshot Tests

```bash
# Automatically starts app and runs tests
task test-screenshot

# Run specific screenshot test
go test -v -run TestScreenshot_BasicCapture
```

### 4. Stop Background Server (Optional)

```bash
# Stop the background dev server when done
task stop-dev
```

## CLI Tool Options

```
-url string
    URL to capture (default "http://localhost:34115")
    
-output string
    Output file path (default: screenshots/capture-<timestamp>.png)
    
-selector string
    CSS selector to wait for before capturing (default "body")
    
-wait duration
    Duration to wait after page load (default 1s)
    
-width int
    Viewport width (default 1280)
    
-height int
    Viewport height (default 800)
    
-full
    Capture full page (default true)
```

## Usage Examples

### Example 1: Basic Screenshot

```go
import (
    "context"
    "src/backend/screenshot"
)

func captureMainView() error {
    cfg := screenshot.DefaultConfig()
    cfg.OutputPath = "screenshots/main-view.png"
    
    ctx := context.Background()
    return screenshot.Capture(ctx, cfg)
}
```

### Example 2: Screenshot After Interaction

```go
import (
    "github.com/chromedp/chromedp"
)

func captureAfterClick() error {
    cfg := screenshot.DefaultConfig()
    cfg.OutputPath = "screenshots/after-click.png"
    
    // Click a button before capturing
    action := chromedp.Click("#my-button", chromedp.ByQuery)
    
    ctx := context.Background()
    return screenshot.CaptureWithAction(ctx, cfg, action)
}
```

### Example 3: Capture Sequence

```go
func captureUserFlow() error {
    steps := []screenshot.ScreenshotStep{
        {
            OutputPath:   "screenshots/step1-initial.png",
            WaitSelector: "body",
            WaitDuration: 1 * time.Second,
            Description:  "Initial load",
        },
        {
            OutputPath:   "screenshots/step2-form-filled.png",
            WaitSelector: "#submit-button",
            Action: chromedp.ActionFunc(func(ctx context.Context) error {
                // Fill form
                return chromedp.SendKeys("#name-input", "Test User").Do(ctx)
            }),
            Description: "Form filled",
        },
        {
            OutputPath:   "screenshots/step3-submitted.png",
            WaitSelector: ".success-message",
            Action:       chromedp.Click("#submit-button", chromedp.ByQuery),
            Description:  "After submission",
        },
    }
    
    ctx := context.Background()
    return screenshot.CaptureSequence(ctx, "http://localhost:34115", steps)
}
```

### Example 4: Test Different Window Sizes

```go
func TestResponsiveLayout(t *testing.T) {
    sizes := []struct {
        name   string
        width  int
        height int
    }{
        {"mobile", 375, 667},
        {"tablet", 768, 1024},
        {"desktop", 1920, 1080},
    }
    
    ctx := context.Background()
    
    for _, size := range sizes {
        cfg := &screenshot.Config{
            URL:          "http://localhost:34115",
            OutputPath:   fmt.Sprintf("screenshots/%s.png", size.name),
            WaitSelector: "body",
            WaitDuration: 1 * time.Second,
            Width:        size.width,
            Height:       size.height,
        }
        
        if err := screenshot.Capture(ctx, cfg); err != nil {
            t.Errorf("failed to capture %s: %v", size.name, err)
        }
    }
}
```

## Integration with Tests

Add screenshot capture to your integration tests:

```go
func TestIntegration_WithScreenshots(t *testing.T) {
    if os.Getenv("WAILS_APP_RUNNING") == "" {
        t.Skip("Skipping - app not running")
    }
    
    app := setupIntegrationTest(t)
    defer app.db.Close()
    
    // Create test data
    project := createTestProject(t, app)
    
    // Capture screenshot of the result
    cfg := screenshot.DefaultConfig()
    cfg.OutputPath = filepath.Join(t.TempDir(), "test-result.png")
    
    ctx := context.Background()
    if err := screenshot.Capture(ctx, cfg); err != nil {
        t.Logf("Screenshot capture failed: %v", err)
    } else {
        t.Logf("Screenshot saved: %s", cfg.OutputPath)
    }
    
    // Continue with assertions...
}
```

## Debugging UI Issues

When you encounter a UI issue:

1. **Start the app**: `wails dev`
2. **Navigate to the problematic view** in the app
3. **Capture screenshot**:

   ```bash
   ./screenshot-tool -output screenshots/issue-alignment.png
   ```

4. **Share the screenshot** with the developer/AI

## Common Selectors

Adjust the `-selector` flag based on your app structure:

```bash
# Wait for main app container
-selector "#app"

# Wait for specific component
-selector ".project-list"

# Wait for data-testid attribute
-selector "[data-testid='project-form']"

# Wait for any element with class
-selector ".loaded"
```

## Troubleshooting

### Chrome Not Found

If you get "chrome not found" errors:

**macOS:**

```bash
# Chrome is usually auto-detected
# If not, install Chrome or Chromium
brew install --cask google-chrome
```

**Linux:**

```bash
sudo apt-get install chromium-browser
# or
sudo apt-get install google-chrome-stable
```

**Windows:**
Download and install Chrome from google.com/chrome

### App Not Running

Make sure your Wails app is running:

```bash
cd statli
wails dev
```

Check that it's accessible at `http://localhost:34115`

### Timeout Errors

If screenshots timeout:

- Increase `-wait` duration
- Check that the selector exists in your HTML
- Verify the app is fully loaded

### Headless CI

For CI environments without display:

```bash
# Tests will automatically skip if CI=1 and DISPLAY is not set
CI=1 go test -v
```

## Best Practices

1. **Use descriptive filenames**: `screenshots/project-list-alignment-issue.png`
2. **Capture at multiple sizes**: Test responsive behavior
3. **Document what you're capturing**: Add comments or descriptions
4. **Clean up old screenshots**: Don't commit test screenshots to git
5. **Use .gitignore**: Add `screenshots/` to `.gitignore`

## Adding to .gitignore

```bash
echo "screenshots/" >> .gitignore
```

Keep only documentation screenshots in version control, not test outputs.
