package main

import (
	"AssetValidationV2/validate"
	"bytes"
	"crypto/subtle"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ValidationResponse struct {
	IsValid bool `json:"isValid"`
}

var asyncValidationMux sync.Mutex
var asyncValidationCount = 0

const asyncValidationLimit = 2

func beforeValidation() {
	asyncValidationMux.Lock()
	// "< limit" so at most asyncValidationLimit validations run concurrently
	// (the previous "<= limit" allowed one extra — security finding M22).
	if asyncValidationCount < asyncValidationLimit {
		asyncValidationCount++
		asyncValidationMux.Unlock()
		return
	}
	asyncValidationMux.Unlock()

	for {
		time.Sleep(time.Millisecond * 500)
		asyncValidationMux.Lock()
		if asyncValidationCount < asyncValidationLimit {
			asyncValidationCount++
			asyncValidationMux.Unlock()
			break
		}
		asyncValidationMux.Unlock()
	}
}
func afterValidation() {
	asyncValidationMux.Lock()
	asyncValidationCount--
	asyncValidationMux.Unlock()
}

// requireAuthorization enforces the shared secret the .NET backend sends in the
// "robloxAuthorization" header (security finding H8 / P0-2). The previous version
// never checked any credential, so anyone able to reach the port could submit
// untrusted RBXL files for parsing. The expected value comes from the
// ASSET_VALIDATION_AUTHORIZATION environment variable and is compared in constant time.
func requireAuthorization(expected string) fiber.Handler {
	expectedBytes := []byte(expected)
	return func(c *fiber.Ctx) error {
		provided := []byte(c.Get("robloxAuthorization"))
		if len(provided) == 0 || subtle.ConstantTimeCompare(provided, expectedBytes) != 1 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}
		return c.Next()
	}
}

// getBodyLimit caps the request body size to bound memory use when parsing untrusted
// uploads (security finding M22). Default 100 MiB; override with
// ASSET_VALIDATION_BODY_LIMIT_BYTES.
func getBodyLimit() int {
	const def = 100 * 1024 * 1024
	if v := os.Getenv("ASSET_VALIDATION_BODY_LIMIT_BYTES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return def
}

func main() {
	// Fail closed: never run without an authorization secret configured.
	expectedAuth := os.Getenv("ASSET_VALIDATION_AUTHORIZATION")
	if expectedAuth == "" {
		log.Fatal("ASSET_VALIDATION_AUTHORIZATION is not set; refusing to start without an authorization secret")
	}

	app := fiber.New(fiber.Config{
		BodyLimit: getBodyLimit(),
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("AssetValidationServiceV2 OK")
	})

	auth := requireAuthorization(expectedAuth)

	app.Post("/api/v1/validate-place", auth, func(c *fiber.Ctx) error {
		beforeValidation()
		defer afterValidation()

		body := c.Body()
		log.Println("validating place with size=", len(body))
		nReader := bytes.NewReader(body)
		isOk := validate.IsGameValid(nReader)
		return c.Status(200).JSON(ValidationResponse{
			IsValid: isOk,
		})
	})

	app.Post("/api/v1/validate-item", auth, func(c *fiber.Ctx) error {
		beforeValidation()
		defer afterValidation()

		body := c.Body()
		log.Println("validating item with size=", len(body))
		nReader := bytes.NewReader(body)
		isOk := validate.IsItemValid(nReader)
		return c.Status(200).JSON(ValidationResponse{
			IsValid: isOk,
		})
	})

	// Listen address is configurable; in the Docker topology the port is simply not
	// published to the host, so the private network + auth are the isolation boundary.
	listenAddr := os.Getenv("ASSET_VALIDATION_LISTEN")
	if listenAddr == "" {
		listenAddr = ":4300"
	}
	log.Fatal(app.Listen(listenAddr))
}
