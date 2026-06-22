package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	agentToken string
	httpClient *http.Client
}

type RegisterRequest struct {
	InstallToken string `json:"installToken"`
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	OSName       string `json:"osName,omitempty"`
	OSVersion    string `json:"osVersion,omitempty"`
	OSBuild      string `json:"osBuild,omitempty"`
	SerialNumber string `json:"serialNumber"`
	MacAddress   string `json:"macAddress"`
	IPAddress    string `json:"ipAddress"`
	DeviceType   string `json:"deviceType"`
	AgentVersion string `json:"agentVersion"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	BiosSerialNumber string `json:"biosSerialNumber,omitempty"`
	MotherboardSerialNumber string `json:"motherboardSerialNumber,omitempty"`
	CPU string `json:"cpu,omitempty"`
	CPUCores int `json:"cpuCores,omitempty"`
	RamBytes uint64 `json:"ramBytes,omitempty"`
	DiskBytes uint64 `json:"diskBytes,omitempty"`
	DiskFreeBytes uint64 `json:"diskFreeBytes,omitempty"`
	DiskModel string `json:"diskModel,omitempty"`
}

type RegisterResponse struct {
	DeviceID                 string `json:"deviceId"`
	AgentID                  string `json:"agentId"`
	AgentToken               string `json:"agentToken"`
	HeartbeatIntervalSeconds int    `json:"heartbeatIntervalSeconds"`
	InventoryIntervalMinutes int    `json:"inventoryIntervalMinutes"`
}

type HeartbeatRequest struct {
	AgentID      string  `json:"agentId"`
	Hostname     string  `json:"hostname"`
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  float64 `json:"memoryUsage"`
	DiskUsage    float64 `json:"diskUsage"`
	Uptime       string  `json:"uptime"`
	LoggedInUser string  `json:"loggedInUser"`
	IPAddress    string  `json:"ipAddress"`
	MacAddress   string  `json:"macAddress"`
	AgentVersion string  `json:"agentVersion"`
}

type InventoryRequest struct {
	AgentID           string     `json:"agentId"`
	Hostname          string     `json:"hostname"`
	OS                string     `json:"os"`
	OSName            string     `json:"osName,omitempty"`
	OSVersion         string     `json:"osVersion,omitempty"`
	OSBuild           string     `json:"osBuild,omitempty"`
	SerialNumber      string     `json:"serialNumber"`
	Manufacturer      string     `json:"manufacturer"`
	Model             string     `json:"model"`
	BiosSerialNumber  string     `json:"biosSerialNumber,omitempty"`
	MotherboardSerialNumber string `json:"motherboardSerialNumber,omitempty"`
	CPU               string     `json:"cpu,omitempty"`
	CPUCores          int        `json:"cpuCores,omitempty"`
	RamBytes          uint64     `json:"ramBytes,omitempty"`
	DiskBytes         uint64     `json:"diskBytes,omitempty"`
	DiskFreeBytes     uint64     `json:"diskFreeBytes,omitempty"`
	DiskModel         string     `json:"diskModel,omitempty"`
	IPAddress         string     `json:"ipAddress"`
	MacAddress        string     `json:"macAddress"`
	InstalledSoftware []Software `json:"installedSoftware"`
	Services          []Service  `json:"services"`
	Processes         []Process  `json:"processes"`
}

type Software struct {
	Name        string `json:"name"`
	Version     string `json:"version,omitempty"`
	Publisher   string `json:"publisher,omitempty"`
	InstallDate string `json:"installDate,omitempty"`
	Source      string `json:"source,omitempty"`
}

type Service struct {
	ServiceName string `json:"serviceName"`
	DisplayName string `json:"displayName,omitempty"`
	Status string `json:"status"`
	StartType string `json:"startType,omitempty"`
	PathName string `json:"pathName,omitempty"`
	AccountName string `json:"accountName,omitempty"`
}

type Process struct {
	PID int32 `json:"pid"`
	ProcessName string `json:"processName"`
	ExecutablePath string `json:"executablePath,omitempty"`
	Username string `json:"username,omitempty"`
	CPUUsage float64 `json:"cpuUsage,omitempty"`
	MemoryBytes uint64 `json:"memoryBytes,omitempty"`
}

type AgentTask struct {
	ID string `json:"id"`
	Type string `json:"type"`
	Command string `json:"command"`
	Status string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type TaskResult struct {
	Status string `json:"status"`
	Output string `json:"output,omitempty"`
	ErrorOutput string `json:"errorOutput,omitempty"`
	ExitCode int `json:"exitCode,omitempty"`
}

type UninstallRequest struct {
	AgentID string `json:"agentId"`
	Hostname string `json:"hostname,omitempty"`
	UninstallReason string `json:"uninstallReason,omitempty"`
}

func NewClient(baseURL string, agentToken string) *Client {
	return &Client{
		baseURL:    NormalizeBaseURL(baseURL),
		agentToken: agentToken,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func NormalizeBaseURL(baseURL string) string {
	return strings.TrimRight(strings.TrimSpace(baseURL), "/")
}

func (c *Client) Register(payload RegisterRequest) (RegisterResponse, error) {
	var response RegisterResponse
	err := c.post("/agent/register", payload, false, &response)
	return response, err
}

func (c *Client) Heartbeat(payload HeartbeatRequest) error {
	return c.post("/agent/heartbeat", payload, true, nil)
}

func (c *Client) Inventory(payload InventoryRequest) error {
	return c.post("/agent/inventory", payload, true, nil)
}

func (c *Client) Uninstall(payload UninstallRequest) error {
	return c.post("/agent/uninstall", payload, true, nil)
}

func (c *Client) Tasks(agentID string) ([]AgentTask, error) {
	var tasks []AgentTask
	err := c.get("/agent/tasks?agentId="+agentID, true, &tasks)
	return tasks, err
}

func (c *Client) TaskResult(taskID string, payload TaskResult) error {
	return c.post("/agent/tasks/"+taskID+"/result", payload, true, nil)
}

func (c *Client) get(path string, auth bool, responseTarget any) error {
	req, err := http.NewRequest(http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	if auth {
		req.Header.Set("Authorization", "Bearer "+c.agentToken)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	content, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("backend returned %s: %s", resp.Status, strings.TrimSpace(string(content)))
	}
	return json.Unmarshal(content, responseTarget)
}

func (c *Client) post(path string, payload any, auth bool, responseTarget any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if auth {
		req.Header.Set("Authorization", "Bearer "+c.agentToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	content, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("backend returned %s: %s", resp.Status, strings.TrimSpace(string(content)))
	}

	if responseTarget == nil || len(content) == 0 {
		return nil
	}
	return json.Unmarshal(content, responseTarget)
}
