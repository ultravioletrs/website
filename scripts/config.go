package main

import (
	"os"

	"gopkg.in/yaml.v3"
)

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func GetDefaultConfig() *Config {
	return &Config{
		Site: SiteConfig{
			Name: "Ultraviolet",
			Url:  "https://www.ultraviolet.rs",
		},
		Blog: BlogConfig{
			DateFormat:   "January 02, 2006",
			ReadingSpeed: 200,
			CategoryColors: map[string]string{
				"blog": "primary",
			},
		},
		Theme: ThemeConfig{
			FontFamily: "Roboto Mono, monospace, fallback for Roboto Mono",
			CodeTheme:  "github-dark",
		},
	}
}
