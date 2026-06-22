//go:build windows

package collector

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/user"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"golang.org/x/sys/windows/registry"
)

type SystemInfo struct {
	Hostname     string
	OS           string
	OSName       string
	OSVersion    string
	OSBuild      string
	SerialNumber string
	BiosSerialNumber string
	MotherboardSerialNumber string
	Manufacturer string
	Model        string
	CPU          string
	CPUCores     int
	RamBytes     uint64
	DiskBytes    uint64
	DiskFreeBytes uint64
	DiskModel    string
	IPAddress    string
	MacAddress   string
	DeviceType   string
	AgentVersion string
}

type Metrics struct {
	CPUUsage     float64
	MemoryUsage  float64
	DiskUsage    float64
	Uptime       string
	LoggedInUser string
}

func CollectSystemInfo(agentVersion string) (SystemInfo, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return SystemInfo{}, err
	}
	hostInfo, _ := host.Info()
	ipAddress, macAddress := primaryNetwork()
	manufacturer := firstNonEmpty(wmicValue("computersystem", "manufacturer"), registryValue(`HARDWARE\DESCRIPTION\System\BIOS`, "SystemManufacturer"))
	model := firstNonEmpty(wmicValue("computersystem", "model"), registryValue(`HARDWARE\DESCRIPTION\System\BIOS`, "SystemProductName"))
	biosSerial := wmicValue("bios", "serialnumber")
	motherboardSerial := wmicValue("baseboard", "serialnumber")
	cpuName := firstNonEmpty(wmicValue("cpu", "name"), cpuName())
	cpuCores, _ := strconv.Atoi(firstNonEmpty(wmicValue("cpu", "NumberOfCores"), "0"))
	ramBytes := uint64(0)
	if memory, err := mem.VirtualMemory(); err == nil {
		ramBytes = memory.Total
	}
	diskBytes := uint64(0)
	diskFreeBytes := uint64(0)
	if partitions, err := disk.Partitions(false); err == nil {
		for _, partition := range partitions {
			if usage, err := disk.Usage(partition.Mountpoint); err == nil {
				diskBytes += usage.Total
				diskFreeBytes += usage.Free
			}
		}
	}
	osName, osVersion, osBuild := osDetails(hostInfo)

	return SystemInfo{
		Hostname:     hostname,
		OS:           osCaption(osName, osVersion, osBuild),
		OSName:       osName,
		OSVersion:    osVersion,
		OSBuild:      osBuild,
		SerialNumber: firstNonEmpty(biosSerial, motherboardSerial),
		BiosSerialNumber: biosSerial,
		MotherboardSerialNumber: motherboardSerial,
		Manufacturer: manufacturer,
		Model:        model,
		CPU:          cpuName,
		CPUCores:     cpuCores,
		RamBytes:     ramBytes,
		DiskBytes:    diskBytes,
		DiskFreeBytes: diskFreeBytes,
		DiskModel:    wmicValue("diskdrive", "model"),
		IPAddress:    ipAddress,
		MacAddress:   macAddress,
		DeviceType:   "Workstation",
		AgentVersion: agentVersion,
	}, nil
}

func cpuName() string {
	info, err := cpu.Info()
	if err != nil || len(info) == 0 {
		return ""
	}
	return strings.TrimSpace(info[0].ModelName)
}

func registryValue(path string, name string) string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.READ)
	if err != nil {
		return ""
	}
	defer key.Close()
	value, _, err := key.GetStringValue(name)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(value)
}

func registryIntValue(path string, name string) string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.READ)
	if err != nil {
		return ""
	}
	defer key.Close()
	value, _, err := key.GetIntegerValue(name)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%d", value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func CollectMetrics() Metrics {
	cpuUsage := 0.0
	if values, err := cpu.Percent(500*time.Millisecond, false); err == nil && len(values) > 0 {
		cpuUsage = values[0]
	}

	memoryUsage := 0.0
	if memory, err := mem.VirtualMemory(); err == nil {
		memoryUsage = memory.UsedPercent
	}

	diskUsage := 0.0
	if usage, err := disk.Usage(`C:\`); err == nil {
		diskUsage = usage.UsedPercent
	}

	uptime := ""
	if info, err := host.Info(); err == nil {
		uptime = formatUptime(info.Uptime)
	}

	return Metrics{
		CPUUsage:     round(cpuUsage),
		MemoryUsage:  round(memoryUsage),
		DiskUsage:    round(diskUsage),
		Uptime:       uptime,
		LoggedInUser: loggedInUser(),
	}
}

func primaryNetwork() (string, string) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return "", ""
	}
	for _, item := range interfaces {
		if item.Flags&net.FlagUp == 0 || item.Flags&net.FlagLoopback != 0 || len(item.HardwareAddr) == 0 {
			continue
		}
		addresses, err := item.Addrs()
		if err != nil {
			continue
		}
		for _, address := range addresses {
			var ip net.IP
			switch value := address.(type) {
			case *net.IPNet:
				ip = value.IP
			case *net.IPAddr:
				ip = value.IP
			}
			if ip == nil || ip.To4() == nil || ip.IsLoopback() {
				continue
			}
			return ip.String(), item.HardwareAddr.String()
		}
	}
	return "", ""
}

func osDetails(info *host.InfoStat) (string, string, string) {
	productName := registryValue(`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "ProductName")
	displayVersion := registryValue(`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "DisplayVersion")
	currentBuild := registryValue(`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "CurrentBuildNumber")
	ubr := registryIntValue(`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "UBR")
	if productName != "" {
		version := displayVersion
		if currentBuild != "" {
			build := currentBuild
			if ubr != "" {
				build += "." + ubr
			}
			if version == "" {
				version = build
			}
			return strings.TrimPrefix(productName, "Microsoft "), version, build
		}
		return strings.TrimPrefix(productName, "Microsoft "), version, ""
	}
	if info == nil {
		return "Windows", "", ""
	}
	return firstNonEmpty(info.Platform, "Windows"), info.PlatformVersion, info.KernelVersion
}

func osCaption(name string, version string, build string) string {
	parts := []string{name}
	if version != "" {
		parts = append(parts, version)
	}
	if build != "" {
		parts = append(parts, "Build "+build)
	}
	return strings.Join(parts, " ")
}

func wmicValue(alias string, property string) string {
	output, err := exec.Command("wmic", alias, "get", property, "/value").Output()
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(output), "\n") {
		line = strings.TrimSpace(line)
		prefix := property + "="
		if strings.HasPrefix(strings.ToLower(line), strings.ToLower(prefix)) {
			return strings.TrimSpace(line[len(prefix):])
		}
	}
	return ""
}

func loggedInUser() string {
	domain := strings.TrimSpace(os.Getenv("USERDOMAIN"))
	name := strings.TrimSpace(os.Getenv("USERNAME"))
	if domain != "" && name != "" {
		return domain + `\` + name
	}
	if current, err := user.Current(); err == nil {
		return current.Username
	}
	return name
}

func formatUptime(seconds uint64) string {
	duration := time.Duration(seconds) * time.Second
	days := int(duration.Hours()) / 24
	hours := int(duration.Hours()) % 24
	if days > 0 {
		return fmt.Sprintf("%d days %d hours", days, hours)
	}
	return fmt.Sprintf("%d hours", hours)
}

func round(value float64) float64 {
	return float64(int(value*100)) / 100
}
