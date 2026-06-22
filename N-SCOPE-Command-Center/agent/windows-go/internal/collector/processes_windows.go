//go:build windows

package collector

import (
	"path/filepath"

	"nscope-agent/internal/api"

	"github.com/shirou/gopsutil/v3/process"
)

func CollectProcesses() ([]api.Process, error) {
	items, err := process.Processes()
	if err != nil {
		return nil, err
	}

	results := make([]api.Process, 0, len(items))
	for _, item := range items {
		name, _ := item.Name()
		exe, _ := item.Exe()
		username, _ := item.Username()
		cpuUsage, _ := item.CPUPercent()
		memory, _ := item.MemoryInfo()
		if name == "" && exe != "" {
			name = filepath.Base(exe)
		}
		if name == "" {
			continue
		}
		memoryBytes := uint64(0)
		if memory != nil {
			memoryBytes = memory.RSS
		}
		results = append(results, api.Process{
			PID: item.Pid,
			ProcessName: name,
			ExecutablePath: exe,
			Username: username,
			CPUUsage: cpuUsage,
			MemoryBytes: memoryBytes,
		})
	}
	return results, nil
}
