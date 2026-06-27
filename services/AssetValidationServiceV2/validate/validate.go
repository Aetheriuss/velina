package validate

import (
	"errors"
	"fmt"
	"github.com/robloxapi/rbxfile"
	"github.com/robloxapi/rbxfile/rbxl"
	"io"
	"log"
	"os"
	"strconv"
)

// maxInstances bounds the number of parsed instances accepted from an untrusted RBXL upload
// (security finding M15: instance-explosion / decompression-bomb defense). Override with
// ASSET_VALIDATION_MAX_INSTANCES.
func maxInstances() int {
	const def = 250000
	if v := os.Getenv("ASSET_VALIDATION_MAX_INSTANCES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return def
}

// countInstances counts every instance in the tree, short-circuiting once it exceeds limit.
func countInstances(instances []*rbxfile.Instance, limit int) int {
	total := 0
	for _, inst := range instances {
		if inst == nil {
			continue
		}
		total++
		if total > limit {
			return total
		}
		total += countInstances(inst.Children, limit-total)
		if total > limit {
			return total
		}
	}
	return total
}

// LoadFile decodes an untrusted RBXL stream. It recovers from any panic in the third-party decoder
// (malformed/crafted input must not crash the service — security finding M15) and rejects files whose
// instance count exceeds the configured cap.
func LoadFile(reader io.Reader) (root *rbxfile.Root, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("[warn] recovered from panic decoding RBXL:", r)
			root = nil
			err = errors.New("panic while decoding RBXL")
		}
	}()
	root, warn, err := rbxl.Decoder{}.Decode(reader)
	if err != nil {
		return nil, err
	}
	if warn != nil {
		fmt.Println("[info] read warning:", warn)
	}
	limit := maxInstances()
	if countInstances(root.Instances, limit) > limit {
		return nil, fmt.Errorf("RBXL exceeds instance limit (%d)", limit)
	}
	return root, nil
}

func IsItemValid(reader io.Reader) bool {
	file, err := LoadFile(reader)
	if err != nil {
		log.Println("Invalid item file:", err)
		return false
	}
	services := make(map[string]*rbxfile.Instance)
	for _, item := range file.Instances {
		if item.IsService {
			services[item.ClassName] = item
		}
	}
	log.Println("item data", file, services)
	return len(services) == 0
}

func IsGameValid(reader io.Reader) bool {
	file, err := LoadFile(reader)
	if err != nil {
		log.Println("Invalid place file:", err)
		return false
	}
	services := make(map[string]*rbxfile.Instance)
	for _, item := range file.Instances {
		if item.IsService {
			services[item.ClassName] = item
		}
	}
	//fmt.Println("all services", services)
	if _, exists := services["Lighting"]; !exists {
		return false
	}
	_, workspaceExists := services["Workspace"]
	if !workspaceExists {
		return false
	}

	return true
}
