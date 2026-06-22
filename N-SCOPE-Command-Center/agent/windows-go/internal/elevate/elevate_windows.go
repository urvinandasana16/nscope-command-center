//go:build windows

package elevate

import (
	"os"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

func IsAdmin() bool {
	var token windows.Token
	err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token)
	if err != nil {
		return false
	}
	defer token.Close()

	elevated, err := token.IsElevated()
	return err == nil && elevated
}

func RelaunchAsAdmin(args []string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	verb, err := syscall.UTF16PtrFromString("runas")
	if err != nil {
		return err
	}
	file, err := syscall.UTF16PtrFromString(exe)
	if err != nil {
		return err
	}
	parameters, err := syscall.UTF16PtrFromString(quoteArgs(args))
	if err != nil {
		return err
	}
	cwd, err := syscall.UTF16PtrFromString("")
	if err != nil {
		return err
	}

	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecute := shell32.NewProc("ShellExecuteW")
	result, _, callErr := shellExecute.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(file)),
		uintptr(unsafe.Pointer(parameters)),
		uintptr(unsafe.Pointer(cwd)),
		1,
	)
	if result <= 32 {
		return callErr
	}
	return nil
}

func quoteArgs(args []string) string {
	quoted := make([]string, 0, len(args))
	for _, arg := range args {
		escaped := strings.ReplaceAll(arg, `"`, `\"`)
		if strings.ContainsAny(escaped, " \t") {
			escaped = `"` + escaped + `"`
		}
		quoted = append(quoted, escaped)
	}
	return strings.Join(quoted, " ")
}
