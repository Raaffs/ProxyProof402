package config

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	HederaNetwork string `json:"hedera_network"`
	TopicID       string `json:"topic_id"`
	MirrorNodeURL string `json:"mirror_node_url"`
}

func LoadConfig(configPath string) (*Config, error) {
	configFile, err := os.Open(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file at %s: %w", configPath, err)
	}
	defer configFile.Close()

	var cfg Config
	if err := json.NewDecoder(configFile).Decode(&cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &cfg, nil
}