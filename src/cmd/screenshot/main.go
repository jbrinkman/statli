package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"src/backend/screenshot"
)

func main() {
	// Define flags
	url := flag.String("url", "http://localhost:34115", "URL to capture")
	output := flag.String("output", "", "Output file path (default: screenshots/capture-<timestamp>.png)")
	selector := flag.String("selector", "body", "CSS selector to wait for")
	wait := flag.Duration("wait", 1*time.Second, "Duration to wait after page load")
	width := flag.Int("width", 1280, "Viewport width")
	height := flag.Int("height", 800, "Viewport height")
	fullPage := flag.Bool("full", true, "Capture full page")

	flag.Parse()

	// Generate default output path if not provided
	outputPath := *output
	if outputPath == "" {
		timestamp := time.Now().Format("2006-01-02-150405")
		outputPath = filepath.Join("screenshots", fmt.Sprintf("capture-%s.png", timestamp))
	}

	// Create config
	cfg := &screenshot.Config{
		URL:          *url,
		OutputPath:   outputPath,
		WaitSelector: *selector,
		WaitDuration: *wait,
		FullPage:     *fullPage,
		Width:        *width,
		Height:       *height,
	}

	// Capture screenshot
	ctx := context.Background()
	if err := screenshot.Capture(ctx, cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error capturing screenshot: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Screenshot saved to: %s\n", outputPath)
}
