package models

type HCS14AgentCard struct {
	P           string            `json:"p"`           // Protocol identifier, e.g., "hcs-14"
	Op          string            `json:"op"`          // Operation: "register", "update", etc.
	Name        string            `json:"name"`        // Agent name
	Description string            `json:"description"` // Agent capabilities
	Endpoints   []string          `json:"endpoints"`   // Proxy / API endpoints
	MetaData    map[string]string `json:"metadata"`    // Pricing, specs, or routing metadata
}