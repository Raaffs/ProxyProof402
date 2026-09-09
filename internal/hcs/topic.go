package hcs

import (
	"fmt"
	"log"
 	hedera "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"

)

// CreateTopic creates a new HCS topic on Hedera with a custom memo.
func (c *Client) CreateTopic(memo string) (hedera.TopicID, error) {
	tx, err := hedera.NewTopicCreateTransaction().
		SetTopicMemo(memo).
		Execute(c.sdkClient)
	if err != nil {
		return hedera.TopicID{}, fmt.Errorf("failed to execute topic creation: %w", err)
	}

	receipt, err := tx.GetReceipt(c.sdkClient)
	if err != nil {
		return hedera.TopicID{}, fmt.Errorf("failed to get topic creation receipt: %w", err)
	}

	return *receipt.TopicID, nil
}

// PostToTopic publishes a raw byte payload to the specified Topic ID.
func (c *Client) PostToTopic(message []byte) (uint64, error) {
	tx, err := hedera.NewTopicMessageSubmitTransaction().
		SetTopicID(c.TopicID).
		SetMessage(message).
		Execute(c.sdkClient)
	if err != nil {
		return 0, fmt.Errorf("failed to execute message submit: %w", err)
	}

	receipt, err := tx.GetReceipt(c.sdkClient)
	if err != nil {
		return 0, fmt.Errorf("failed to get message receipt: %w", err)
	}

	return receipt.TopicSequenceNumber, nil
}

// SubscribeToTopic listens for incoming stream messages on a Topic ID via Mirror Node.
func (c *Client) SubscribeToTopic(topicID hedera.TopicID, handleMessage func(message []byte, seqNum uint64)) (hedera.SubscriptionHandle, error) {
	handle, err := hedera.NewTopicMessageQuery().
		SetTopicID(topicID).
		Subscribe(c.sdkClient, func(resp hedera.TopicMessage) {
			handleMessage(resp.Contents, resp.SequenceNumber)
		})
	if err != nil {
		return hedera.SubscriptionHandle{}, fmt.Errorf("failed to subscribe to topic %s: %w", topicID.String(), err)
	}

	log.Printf("Subscribed to Mirror Node for Topic ID: %s\n", topicID.String())
	return handle, nil
}