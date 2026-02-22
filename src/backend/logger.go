package backend

import (
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// InitLogger initializes the zap structured logger
func InitLogger() (*zap.Logger, error) {
	// Get user's home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	// Create logs directory
	logsDir := filepath.Join(homeDir, ".statli", "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, err
	}

	// Configure logger
	config := zap.NewProductionConfig()
	config.OutputPaths = []string{
		"stdout",
		filepath.Join(logsDir, "app.log"),
	}
	config.ErrorOutputPaths = []string{
		"stderr",
		filepath.Join(logsDir, "error.log"),
	}
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, err := config.Build()
	if err != nil {
		return nil, err
	}

	logger.Info("logger initialized",
		zap.String("logs_dir", logsDir),
	)

	return logger, nil
}
