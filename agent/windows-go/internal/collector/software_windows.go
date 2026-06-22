//go:build windows

package collector

import (
	"strings"

	"golang.org/x/sys/windows/registry"
	"nscope-agent/internal/api"
)

var uninstallRegistryPaths = []string{
	`Software\Microsoft\Windows\CurrentVersion\Uninstall`,
	`Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`,
}

func CollectInstalledSoftware() ([]api.Software, error) {
	seen := map[string]bool{}
	var results []api.Software

	for _, registryPath := range uninstallRegistryPaths {
		items, err := readUninstallKey(registryPath)
		if err != nil {
			continue
		}
		for _, item := range items {
			key := strings.ToLower(item.Name + "|" + item.Version + "|" + item.Publisher)
			if item.Name == "" || seen[key] {
				continue
			}
			seen[key] = true
			results = append(results, item)
		}
	}

	return results, nil
}

func readUninstallKey(registryPath string) ([]api.Software, error) {
	root, err := registry.OpenKey(registry.LOCAL_MACHINE, registryPath, registry.READ)
	if err != nil {
		return nil, err
	}
	defer root.Close()

	names, err := root.ReadSubKeyNames(-1)
	if err != nil {
		return nil, err
	}

	var results []api.Software
	for _, name := range names {
		subkey, err := registry.OpenKey(root, name, registry.READ)
		if err != nil {
			continue
		}
		displayName, _, _ := subkey.GetStringValue("DisplayName")
		version, _, _ := subkey.GetStringValue("DisplayVersion")
		publisher, _, _ := subkey.GetStringValue("Publisher")
		installDate, _, _ := subkey.GetStringValue("InstallDate")
		subkey.Close()

		displayName = strings.TrimSpace(displayName)
		if displayName == "" {
			continue
		}
		results = append(results, api.Software{
			Name:        displayName,
			Version:     strings.TrimSpace(version),
			Publisher:   strings.TrimSpace(publisher),
			InstallDate: strings.TrimSpace(installDate),
			Source:      "registry",
		})
	}

	return results, nil
}
