package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"nscope-agent/internal/api"
	"nscope-agent/internal/collector"
	"nscope-agent/internal/config"
	"nscope-agent/internal/elevate"
	"nscope-agent/internal/embed"
	"nscope-agent/internal/logger"
	"nscope-agent/internal/runner"
	svc "nscope-agent/internal/service"
)

const agentVersion = "1.0.0"

func main() {
	if len(os.Args) < 2 {
		if !svc.IsInteractive() {
			exitIfError("service run", svc.Run())
			return
		}
		if payload, ok := embed.EmbeddedPayload(); ok {
			fmt.Println("Embedded config found")
			if err := installEmbedded(payload); err != nil {
				fmt.Fprintf(os.Stderr, "install failed: %v\n", err)
				os.Exit(1)
			}
			return
		}
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "install":
		if err := install(os.Args[2:]); err != nil {
			fmt.Fprintf(os.Stderr, "install failed: %v\n", err)
			os.Exit(1)
		}
	case "run":
		if err := runForeground(); err != nil {
			fmt.Fprintf(os.Stderr, "run failed: %v\n", err)
			os.Exit(1)
		}
	case "start":
		exitIfError("start", svc.Start())
	case "stop":
		exitIfError("stop", svc.Stop())
	case "uninstall":
		exitIfError("uninstall", uninstall())
	case "status":
		exitIfError("status", printStatus())
	case "inspect-embed":
		exitIfError("inspect-embed", inspectEmbed())
	default:
		printUsage()
		os.Exit(1)
	}
}

func installEmbedded(payload embed.Payload) error {
	if err := logEmbeddedEvent("Embedded config found"); err != nil {
		fmt.Fprintf(os.Stderr, "log warning: %v\n", err)
	}
	if err := logEmbeddedEvent("Starting embedded install"); err != nil {
		fmt.Fprintf(os.Stderr, "log warning: %v\n", err)
	}

	if !elevate.IsAdmin() {
		if err := elevate.RelaunchAsAdmin(nil); err != nil {
			return fmt.Errorf("administrator permission is required to install N-SCOPE Agent: %w", err)
		}
		fmt.Println("N-SCOPE Agent elevation requested. Approve the UAC prompt to continue installation.")
		return nil
	}

	args := []string{
		"--server", payload.ServerURL,
		"--token", payload.InstallToken,
		"--device-type", firstNonEmpty(payload.DeviceType, "Workstation"),
	}
	return install(args)
}

func install(args []string) error {
	flags := flag.NewFlagSet("install", flag.ContinueOnError)
	serverURL := flags.String("server", "", "N-SCOPE API URL, for example http://server:5000/api")
	installToken := flags.String("token", "", "one-time install token")
	deviceType := flags.String("device-type", "Workstation", "device type, for example Workstation or Server")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *serverURL == "" || *installToken == "" {
		return errors.New("install requires --server and --token")
	}

	if err := config.EnsureDirectories(); err != nil {
		return err
	}
	log, err := logger.New(config.LogPath)
	if err != nil {
		return err
	}
	defer log.Close()

	log.Info("Agent install started")
	systemInfo, err := collector.CollectSystemInfo(agentVersion)
	if err != nil {
		return err
	}

	log.Info("Registering with backend")
	client := api.NewClient(*serverURL, "")
	registerResponse, err := client.Register(api.RegisterRequest{
		InstallToken: *installToken,
		Hostname:     systemInfo.Hostname,
		OS:           systemInfo.OS,
		OSName:       systemInfo.OSName,
		OSVersion:    systemInfo.OSVersion,
		OSBuild:      systemInfo.OSBuild,
		SerialNumber: systemInfo.SerialNumber,
		MacAddress:   systemInfo.MacAddress,
		IPAddress:    systemInfo.IPAddress,
		DeviceType:   firstNonEmpty(*deviceType, systemInfo.DeviceType, "Workstation"),
		AgentVersion: agentVersion,
		Manufacturer: systemInfo.Manufacturer,
		Model:        systemInfo.Model,
		BiosSerialNumber: systemInfo.BiosSerialNumber,
		MotherboardSerialNumber: systemInfo.MotherboardSerialNumber,
		CPU: systemInfo.CPU,
		CPUCores: systemInfo.CPUCores,
		RamBytes: systemInfo.RamBytes,
		DiskBytes: systemInfo.DiskBytes,
		DiskFreeBytes: systemInfo.DiskFreeBytes,
		DiskModel: systemInfo.DiskModel,
	})
	if err != nil {
		log.Error("Registration failed: %v", err)
		return err
	}
	log.Info("Register success for agentId=%s deviceId=%s", registerResponse.AgentID, registerResponse.DeviceID)

	cfg := config.Config{
		ServerURL:                api.NormalizeBaseURL(*serverURL),
		DeviceID:                 registerResponse.DeviceID,
		AgentID:                  registerResponse.AgentID,
		AgentToken:               registerResponse.AgentToken,
		HeartbeatIntervalSeconds: registerResponse.HeartbeatIntervalSeconds,
		InventoryIntervalMinutes: registerResponse.InventoryIntervalMinutes,
		AgentVersion:             agentVersion,
	}
	cfg.ApplyDefaults()
	if err := config.Save(cfg); err != nil {
		return err
	}
	log.Info("Config saved at %s", config.ConfigPath)

	if err := copySelf(config.InstallExePath); err != nil {
		return err
	}
	log.Info("Agent binary copied to %s", config.InstallExePath)

	if err := svc.Install(config.InstallExePath); err != nil {
		log.Error("Service install failed: %v", err)
		return err
	}
	log.Info("Service installed")

	if err := svc.Start(); err != nil {
		log.Error("Service start failed: %v", err)
		return err
	}
	log.Info("Service started")

	agentClient := api.NewClient(cfg.ServerURL, cfg.AgentToken)
	if err := sendInventory(agentClient, cfg, log); err != nil {
		log.Error("Initial inventory failed: %v", err)
	} else {
		log.Info("Initial inventory success")
	}

	fmt.Println("N-SCOPE Agent installed and service started.")
	return nil
}

func inspectEmbed() error {
	payload, found, err := embed.InspectPayload()
	fmt.Printf("embeddedConfigFound %t\n", found)
	if err != nil {
		fmt.Printf("error %v\n", err)
		return nil
	}
	if !found {
		return nil
	}

	fmt.Printf("serverUrl %s\n", payload.ServerURL)
	fmt.Printf("tokenId %s\n", payload.TokenID)
	fmt.Printf("clientId %s\n", payload.ClientID)
	fmt.Printf("siteId %s\n", payload.SiteID)
	fmt.Printf("deviceType %s\n", payload.DeviceType)
	fmt.Printf("agentType %s\n", payload.AgentType)
	return nil
}

func logEmbeddedEvent(message string) error {
	if err := config.EnsureDirectories(); err != nil {
		return err
	}
	log, err := logger.New(config.LogPath)
	if err != nil {
		return err
	}
	defer log.Close()
	log.Info(message)
	return nil
}

func runForeground() error {
	if err := config.EnsureDirectories(); err != nil {
		return err
	}
	log, err := logger.New(config.LogPath)
	if err != nil {
		return err
	}
	defer log.Close()

	log.Info("Agent foreground run starting")
	return runner.New(log).Run(context.Background())
}

func uninstall() error {
	cfg, cfgErr := config.Load()
	if cfgErr == nil {
		if err := config.EnsureDirectories(); err == nil {
			if log, logErr := logger.New(config.LogPath); logErr == nil {
				systemInfo, _ := collector.CollectSystemInfo(cfg.AgentVersion)
				client := api.NewClient(cfg.ServerURL, cfg.AgentToken)
				if err := client.Uninstall(api.UninstallRequest{
					AgentID: cfg.AgentID,
					Hostname: systemInfo.Hostname,
					UninstallReason: "User requested uninstall",
				}); err != nil {
					log.Error("Backend uninstall notification failed: %v", err)
				} else {
					log.Info("Backend uninstall notification sent")
				}
				log.Close()
			}
		}
	}
	return svc.Uninstall()
}

func sendInventory(client *api.Client, cfg config.Config, log *logger.Logger) error {
	systemInfo, err := collector.CollectSystemInfo(agentVersion)
	if err != nil {
		return err
	}
	software, err := collector.CollectInstalledSoftware()
	if err != nil {
		log.Error("Installed software collection failed: %v", err)
	}
	services, err := collector.CollectServices()
	if err != nil {
		log.Error("Services collection failed: %v", err)
	}
	processes, err := collector.CollectProcesses()
	if err != nil {
		log.Error("Processes collection failed: %v", err)
	}
	return client.Inventory(api.InventoryRequest{
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
}

func printStatus() error {
	status, err := svc.Status()
	if err != nil {
		fmt.Printf("Service: not installed or unavailable (%v)\n", err)
	} else {
		fmt.Printf("Service: %s\n", status)
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Config: missing or unreadable (%s)\n", config.ConfigPath)
		return nil
	}
	fmt.Println("Config: present")
	fmt.Printf("agentId: %s\n", cfg.AgentID)
	fmt.Printf("serverUrl: %s\n", cfg.ServerURL)
	return nil
}

func copySelf(destination string) error {
	source, err := os.Executable()
	if err != nil {
		return err
	}
	sourceFile, err := os.Open(source)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
		return err
	}
	destinationFile, err := os.OpenFile(destination, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0755)
	if err != nil {
		return err
	}
	defer destinationFile.Close()

	_, err = io.Copy(destinationFile, sourceFile)
	return err
}

func exitIfError(action string, err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s failed: %v\n", action, err)
		os.Exit(1)
	}
	fmt.Printf("%s successful\n", action)
}

func printUsage() {
	fmt.Println("N-SCOPE Agent")
	fmt.Println("Usage:")
	fmt.Println("  nscope-agent.exe install --server <API_URL> --token <INSTALL_TOKEN>")
	fmt.Println("  nscope-agent.exe run")
	fmt.Println("  nscope-agent.exe start")
	fmt.Println("  nscope-agent.exe stop")
	fmt.Println("  nscope-agent.exe uninstall")
	fmt.Println("  nscope-agent.exe status")
	fmt.Println("  nscope-agent.exe inspect-embed")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
