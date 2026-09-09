package hcs

import (
	"fmt"

	sdk "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"
)

// ParseTopicID converts a raw topic ID string (e.g., "0.0.10402297") into an sdk.TopicID struct.
func ParseTopicID(rawTopicID string) (sdk.TopicID, error) {
	topicID, err := sdk.TopicIDFromString(rawTopicID)
	if err != nil {
		return sdk.TopicID{}, fmt.Errorf("invalid topic ID string '%s': %w", rawTopicID, err)
	}
	return topicID, nil
}