# Screenshot Quick Start

## For You (When Describing UI Issues)

When you encounter a UI problem and want me to see it:

### Option 1: Automatic (Recommended)

```bash
cd statli

# Takes screenshot and starts app automatically if needed
task screenshot
```

### Option 2: Manual Control

```bash
cd statli

# Start the app manually
wails dev

# In another terminal, take screenshot
task screenshot-tool
./screenshot-tool -output screenshots/alignment-issue.png
```

## For Me (When You Describe Issues)

When you describe a UI issue, I can request:

```bash
# I'll ask you to run:
./screenshot-tool -output screenshots/issue-description.png

# Or for specific views:
./screenshot-tool -selector ".project-list" -output screenshots/project-list-view.png

# Or at different sizes:
./screenshot-tool -width 800 -height 600 -output screenshots/small-window.png
```

## For Automated Testing

### Run screenshot tests

```bash
# Automatically starts app and runs tests
task test-screenshot
```

The task will:

1. Check if the app is already running on port 34115
2. Start it in the background if needed
3. Run the screenshot tests
4. Leave the app running for subsequent tests

To stop the background server:

```bash
task stop-dev
```

### Add screenshot to your test

```go
func TestMyFeature(t *testing.T) {
    // ... test setup ...
    
    // Capture screenshot
    cfg := screenshot.DefaultConfig()
    cfg.OutputPath = "screenshots/my-feature.png"
    screenshot.Capture(context.Background(), cfg)
    
    // ... continue testing ...
}
```

## Common Commands

```bash
# Take screenshot (starts app automatically if needed)
task screenshot

# Take screenshot with custom path (starts app automatically)
task screenshot-custom OUTPUT=screenshots/my-issue.png

# Build screenshot tool only
task screenshot-tool

# Run screenshot tests (starts app automatically)
task test-screenshot

# Stop background dev server
task stop-dev

# Clean up
task clean
```

## Troubleshooting

**"chrome not found"** → Install Chrome/Chromium
**"connection refused"** → Make sure `wails dev` is running
**"timeout"** → Increase wait time: `./screenshot-tool -wait 3s`

## File Locations

- Screenshots saved to: `screenshots/`
- Tool source: `cmd/screenshot/main.go`
- Package: `backend/screenshot/`
- Tests: `app_screenshot_test.go`
- Full guide: `SCREENSHOT_GUIDE.md`
