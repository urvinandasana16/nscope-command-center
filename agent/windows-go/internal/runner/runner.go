package runner

import (
	"context"
	"time"

	"nscope-agent/internal/api"
	"nscope-agent/internal/collector"
	"nscope-agent/internal/config"
	"nscope-agent/internal/logger"
)

type Runner struct {
	log *logger.Logger
}

func New(log *logger.Logger) *Runner {
	return &Runner{log: log}
}

func (r *Runner) Run(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	cfg.ApplyDefaults()
	r.log.Info("Config loaded for agentId=%s server=%s token=%s", cfg.AgentID, cfg.ServerURL, logger.MaskToken(cfg.AgentToken))

	client := api.NewClient(cfg.ServerURL, cfg.AgentToken)
	r.sendInventory(client, cfg)
	r.sendHeartbeat(client, cfg)
	r.processTasks(client, cfg)

	heartbeatTicker := time.NewTicker(time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second)
	defer heartbeatTicker.Stop()

	inventoryTicker := time.NewTicker(time.Duration(cfg.InventoryIntervalMinutes) * time.Minute)
	defer inventoryTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			r.log.Info("Agent runner stopped")
			return nil
		case <-heartbeatTicker.C:
			r.sendHeartbeat(client, cfg)
			r.processTasks(client, cfg)
		case <-inventoryTicker.C:
			r.sendInventory(client, cfg)
		}
	}
}

func (r *Runner) sendHeartbeat(client *api.Client, cfg config.Config) {
	systemInfo, err := collector.CollectSystemInfo(cfg.AgentVersion)
	if err != nil {
		r.log.Error("System collection failed: %v", err)
		return
	}
	metrics := collector.CollectMetrics()
	err = client.Heartbeat(api.HeartbeatRequest{
		AgentID:      cfg.AgentID,
		Hostname:     systemInfo.Hostname,
		CPUUsage:     metrics.CPUUsage,
		MemoryUsage:  metrics.MemoryUsage,
		DiskUsage:    metrics.DiskUsage,
		Uptime:       metrics.Uptime,
		LoggedInUser: metrics.LoggedInUser,
		IPAddress:    systemInfo.IPAddress,
		MacAddress:   systemInfo.MacAddress,
		AgentVersion: cfg.AgentVersion,
	})
	if err != nil {
		r.log.Error("Heartbeat failed: %v", err)
		return
	}
	r.log.Info("Heartbeat success")
}

func (r *Runner) sendInventory(client *api.Client, cfg config.Config) {
	systemInfo, err := collector.CollectSystemInfo(cfg.AgentVersion)
	if err != nil {
		r.log.Error("System collection failed: %v", err)
		return
	}
	software, err := collector.CollectInstalledSoftware()
	if err != nil {
		r.log.Error("Inventory software collection failed: %v", err)
	}
	services, err := collector.CollectServices()
	if err != nil {
		r.log.Error("Inventory service collection failed: %v", err)
	}
	processes, err := collector.CollectProcesses()
	if err != nil {
		r.log.Error("Inventory process collection failed: %v", err)
	}
	err = client.Inventory(api.InventoryRequest{
		AgentID:           cfg.AgentID,
		Hostname:          systemInfo.Hostname,
		OS:                systemInfo.OS,
		OSName:            systemInfo.OSName,
		OSVersion:         systemInfo.OSVersion,
		OSBuild:           systemInfo.OSBuild,
		SerialNumber:      systemInfo.SerialNumber,
		Manufacturer:      systemInfo.Manufacturer,
		Model:             systemInfo.Model,
		BiosSerialNumber:  systemInfo.BiosSerialNumber,
		MotherboardSerialNumber: systemInfo.MotherboardSerialNumber,
		CPU:               systemInfo.CPU,
		CPUCores:          systemInfo.CPUCores,
		RamBytes:          systemInfo.RamBytes,
		DiskBytes:         systemInfo.DiskBytes,
		DiskFreeBytes:     systemInfo.DiskFreeBytes,
		DiskModel:         systemInfo.DiskModel,
		IPAddress:         systemInfo.IPAddress,
		MacAddress:        systemInfo.MacAddress,
		InstalledSoftware: software,
		Services:          services,
		Processes:         processes,
	})
	if err != nil {
		r.log.Error("Inventory failed: %v", err)
		return
	}
	r.log.Info("Inventory success softwareCount=%d serviceCount=%d processCount=%d", len(software), len(services), len(processes))
}

func (r *Runner) processTasks(client *api.Client, cfg config.Config) {
	tasks, err := client.Tasks(cfg.AgentID)
	if err != nil {
		r.log.Error("Task poll failed: %v", err)
		return
	}
	for _, task := range tasks {
		switch task.Type {
		case "CHECK_IN_NOW":
			r.log.Info("Processing CHECK_IN_NOW task=%s", task.ID)
			r.sendHeartbeat(client, cfg)
			r.sendInventory(client, cfg)
			if err := client.TaskResult(task.ID, api.TaskResult{Status: "SUCCESS", Output: "Heartbeat and inventory sent"}); err != nil {
				r.log.Error("Task result failed: %v", err)
			}
		default:
			if err := client.TaskResult(task.ID, api.TaskResult{Status: "FAILED", ErrorOutput: "Unsupported task type"}); err != nil {
				r.log.Error("Unsupported task result failed: %v", err)
			}
		}
	}
}
