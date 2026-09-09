package hcs

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

)

// MirrorNodeMessage represents a single message payload returned by the Mirror Node REST API.
type MirrorNodeMessage struct {
	ConsensusTimestamp string `json:"consensus_timestamp"`
	Message            string `json:"message"` // Base64 encoded payload
	SequenceNumber     uint64 `json:"sequence_number"`
	TopicID            string `json:"topic_id"`
}

// MirrorNodeResponse represents the paginated response structure from the Mirror Node.
type MirrorNodeResponse struct {
	Messages []MirrorNodeMessage `json:"messages"`
}

// ParsedMessage represents a decoded message payload ready for application consumption.
type ParsedMessage struct {
	SequenceNumber uint64
	Timestamp      string
	Payload        []byte
}

// GetTopicMessages retrieves all historical messages for a given Topic ID from the Mirror Node REST API.
func (c *Client) GetTopicMessages() ([]ParsedMessage, error) {
	url := fmt.Sprintf("https://testnet.mirrornode.hedera.com/api/v1/topics/%s/messages",c.TopicID.String())

	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch messages from mirror node: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mirror node returned non-200 status: %d", resp.StatusCode)
	}

	var mirrorResp MirrorNodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&mirrorResp); err != nil {
		return nil, fmt.Errorf("failed to decode mirror node response: %w", err)
	}

	var parsed []ParsedMessage
	for _, m := range mirrorResp.Messages {
		decodedBytes, err := base64.StdEncoding.DecodeString(m.Message)
		if err != nil {
			// Skip malformed/corrupted messages
			continue
		}

		parsed = append(parsed, ParsedMessage{
			SequenceNumber: m.SequenceNumber,
			Timestamp:      m.ConsensusTimestamp,
			Payload:        decodedBytes,
		})
	}

	return parsed, nil
}