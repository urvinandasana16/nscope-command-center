package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	InstallDir = `C:\Program Files\N-SCOPE Agent`
	DataDir    = `C:\ProgramData\N-SCOPE\Agent`
	LogDir     = `C:\ProgramData\N-SCOPE\Agent\logs`

	InstallExePath = InstallDir + `\nscope-agent.exe`
	ConfigPath     = DataDir + `\config.json`
	LogPath        = LogDir + `\agent.log`
)

type Config struct {
	ServerURL                string `json:"serverUrl"`
	DeviceID                 string `json:"deviceId"`
	AgentID                  string `json:"agentId"`
	AgentToken               string `json:"agentToken"`
	HeartbeatIntervalSeconds int    `json:"heartbeatIntervalSeconds"`
	InventoryIntervalMinutes int    `json:"inventoryIntervalMinutes"`
	AgentVersion             string `json:"agentVersion"`
}

func (c *Config) ApplyDefaults() {
	if c.HeartbeatIntervalSeconds <= 0 {
		c.HeartbeatIntervalSeconds = 60
	}
	if c.InventoryIntervalMinutes <= 0 {
		c.InventoryIntervalMinutes = 360
	}
}

func EnsureDirectories() error {
	for _, dir := range []string{InstallDir, DataDir, LogDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func Load() (Config, error) {
	var cfg Config
	content, err := os.ReadFile(ConfigPath)
	if err != nil {
		return cfg, err
	}
	if err := json.Unmarshal(content, &cfg); err != nil {
		return cfg, err
	}
	cfg.ApplyDefaults()
	return cfg, nil
}

func Save(cfg Config) error {
	cfg.ApplyDefaults()
	if err := os.MkdirAll(filepath.Dir(ConfigPath), 0755); err != nil {
		return err
	}
	content, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigPath, content, 0600)
}
