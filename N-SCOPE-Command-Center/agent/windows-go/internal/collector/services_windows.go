//go:build windows

package collector

import (
	"encoding/json"
	"os/exec"
	"strings"

	"nscope-agent/internal/api"
)

type serviceRecord struct {
	Name        string `json:"Name"`
	DisplayName string `json:"DisplayName"`
	State       string `json:"State"`
	StartMode   string `json:"StartMode"`
	PathName    string `json:"PathName"`
	StartName   string `json:"StartName"`
}

func CollectServices() ([]api.Service, error) {
	command := `Get-CimInstance Win32_Service | Select-Object Name,DisplayName,State,StartMode,PathName,StartName | ConvertTo-Json -Compress`
	output, err := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command).Output()
	if err != nil {
		return nil, err
	}
	content := strings.TrimSpace(string(output))
	if content == "" {
		return nil, nil
	}

	var records []serviceRecord
	if strings.HasPrefix(content, "{") {
		var single serviceRecord
		if err := json.Unmarshal([]byte(content), &single); err != nil {
			return nil, err
		}
		records = []serviceRecord{single}
	} else if err := json.Unmarshal([]byte(content), &records); err != nil {
		return nil, err
	}

	results := make([]api.Service, 0, len(records))
	for _, record := range records {
		name := strings.TrimSpace(record.Name)
		if name == "" {
			continue
		}
		results = append(results, api.Service{
			ServiceName: name,
			DisplayName: strings.TrimSpace(record.DisplayName),
			Status: strings.TrimSpace(record.State),
			StartType: strings.TrimSpace(record.StartMode),
			PathName: strings.TrimSpace(record.PathName),
			AccountName: strings.TrimSpace(record.StartName),
		})
	}
	return results, nil
}
