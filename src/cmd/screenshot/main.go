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

	// Navigation flags for capturing specific views
	view := flag.String("view", "", "View to navigate to: projects, tasks, or report")
	projectID := flag.Int("project", 0, "Project ID (required for tasks and report views)")

	flag.Parse()

	// Validate view and project parameters
	if *view != "" && *view != "projects" && *view != "tasks" && *view != "report" && *view != "form" {
		fmt.Fprintf(os.Stderr, "Invalid view: %s. Must be one of: projects, tasks, report, form\n", *view)
		os.Exit(1)
	}
	if (*view == "tasks" || *view == "report") && *projectID == 0 {
		fmt.Fprintf(os.Stderr, "Project ID is required for %s view\n", *view)
		os.Exit(1)
	}

	// Generate default output path if not provided
	outputPath := *output
	if outputPath == "" {
		timestamp := time.Now().Format("2006-01-02-150405")
		viewSuffix := ""
		if *view != "" {
			viewSuffix = fmt.Sprintf("-%s", *view)
			if *projectID > 0 {
				viewSuffix = fmt.Sprintf("%s-p%d", viewSuffix, *projectID)
			}
		}
		outputPath = filepath.Join("screenshots", fmt.Sprintf("capture-%s%s.png", timestamp, viewSuffix))
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

	ctx := context.Background()

	// If a specific view is requested, use CaptureWithAction to navigate
	if *view != "" && *view != "projects" {
		action := screenshot.NavigateToView(*view, *projectID)
		if err := screenshot.CaptureWithAction(ctx, cfg, action); err != nil {
			fmt.Fprintf(os.Stderr, "Error capturing screenshot: %v\n", err)
			os.Exit(1)
		}
	} else {
		// Capture default view (projects)
		if err := screenshot.Capture(ctx, cfg); err != nil {
			fmt.Fprintf(os.Stderr, "Error capturing screenshot: %v\n", err)
			os.Exit(1)
		}
	}

	fmt.Printf("Screenshot saved to: %s\n", outputPath)
}
