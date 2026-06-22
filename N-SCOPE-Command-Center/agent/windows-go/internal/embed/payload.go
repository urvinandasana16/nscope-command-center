package embed

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

var (
	configStartMarker = []byte("__NSCOPE_CONFIG_START__")
	configEndMarker   = []byte("__NSCOPE_CONFIG_END__")
)

type Payload struct {
	ServerURL    string `json:"serverUrl"`
	InstallToken string `json:"installToken"`
	TokenID      string `json:"tokenId"`
	ClientID     string `json:"clientId"`
	SiteID       string `json:"siteId"`
	DeviceType   string `json:"deviceType"`
	AgentType    string `json:"agentType"`
}

func EmbeddedPayload() (Payload, bool) {
	payload, found, err := InspectPayload()
	return payload, found && err == nil
}

func InspectPayload() (Payload, bool, error) {
	exePath, err := os.Executable()
	if err != nil {
		return Payload{}, false, err
	}
	content, err := os.ReadFile(exePath)
	if err != nil {
		return Payload{}, false, err
	}

	start := bytes.LastIndex(content, configStartMarker)
	end := bytes.LastIndex(content, configEndMarker)
	if start < 0 || end < 0 || end <= start {
		return Payload{}, false, nil
	}

	encoded := strings.TrimSpace(string(content[start+len(configStartMarker) : end]))
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return Payload{}, true, fmt.Errorf("decode embedded config: %w", err)
	}

	var payload Payload
	if err := json.Unmarshal(decoded, &payload); err != nil {
		return Payload{}, true, fmt.Errorf("parse embedded config: %w", err)
	}
	if payload.ServerURL == "" || payload.InstallToken == "" {
		return payload, true, fmt.Errorf("embedded config missing serverUrl or installToken")
	}
	return payload, true, nil
}
