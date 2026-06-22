//go:build windows

package service

import (
	"context"

	kservice "github.com/kardianos/service"
	"nscope-agent/internal/config"
	"nscope-agent/internal/logger"
	"nscope-agent/internal/runner"
)

const (
	Name        = "NScopeAgent"
	DisplayName = "N-SCOPE Agent"
	Description = "N-SCOPE endpoint monitoring and management agent"
)

type program struct {
	cancel context.CancelFunc
	log    *logger.Logger
}

func Install(executablePath string) error {
	service, err := newService(&program{}, executablePath)
	if err != nil {
		return err
	}
	return service.Install()
}

func Run() error {
	service, err := newService(&program{}, config.InstallExePath)
	if err != nil {
		return err
	}
	return service.Run()
}

func IsInteractive() bool {
	return kservice.Interactive()
}

func Start() error {
	service, err := newService(&program{}, config.InstallExePath)
	if err != nil {
		return err
	}
	return service.Start()
}

func Stop() error {
	service, err := newService(&program{}, config.InstallExePath)
	if err != nil {
		return err
	}
	return service.Stop()
}

func Uninstall() error {
	service, err := newService(&program{}, config.InstallExePath)
	if err != nil {
		return err
	}
	_ = service.Stop()
	return service.Uninstall()
}

func Status() (string, error) {
	service, err := newService(&program{}, config.InstallExePath)
	if err != nil {
		return "", err
	}
	status, err := service.Status()
	if err != nil {
		return "", err
	}
	switch status {
	case kservice.StatusRunning:
		return "running", nil
	case kservice.StatusStopped:
		return "stopped", nil
	default:
		return "unknown", nil
	}
}

func (p *program) Start(_ kservice.Service) error {
	log, err := logger.New(config.LogPath)
	if err != nil {
		return err
	}
	p.log = log
	ctx, cancel := context.WithCancel(context.Background())
	p.cancel = cancel

	go func() {
		p.log.Info("Service started")
		if err := runner.New(p.log).Run(ctx); err != nil {
			p.log.Error("Service runner failed: %v", err)
		}
	}()
	return nil
}

func (p *program) Stop(_ kservice.Service) error {
	if p.cancel != nil {
		p.cancel()
	}
	if p.log != nil {
		p.log.Info("Service stopped")
		return p.log.Close()
	}
	return nil
}

func newService(program kservice.Interface, executablePath string) (kservice.Service, error) {
	return kservice.New(program, &kservice.Config{
		Name:        Name,
		DisplayName: DisplayName,
		Description: Description,
		Executable:  executablePath,
		Option: kservice.KeyValue{
			"StartType": "automatic",
		},
	})
}
