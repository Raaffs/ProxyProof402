package hcs

import (
	"fmt"

	"proof402/config"

	sdk "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"
)

type Client struct {
	sdkClient     *sdk.Client
	OperatorID    sdk.AccountID
	operatorKey   sdk.PrivateKey
	TopicID       sdk.TopicID
	MirrorNodeURL string
}

// NewClient initializes the HCS client using public config and explicit operator credentials.
func NewClient(cfg *config.Config, operatorIDStr, operatorKeyStr string) (*Client, error) {
	if operatorIDStr == "" || operatorKeyStr == "" {
		return nil, fmt.Errorf("operator ID and private key are required")
	}

	operatorID, err := sdk.AccountIDFromString(operatorIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid OPERATOR_ID: %w", err)
	}

	operatorKey, err := sdk.PrivateKeyFromString(operatorKeyStr)
	if err != nil {
		return nil, fmt.Errorf("invalid OPERATOR_KEY: %w", err)
	}

	topicID, err := sdk.TopicIDFromString(cfg.TopicID)
	if err != nil {
		return nil, fmt.Errorf("invalid TopicID in config: %w", err)
	}

	var sdkClient *sdk.Client
	switch cfg.HederaNetwork {
	case "mainnet":
		sdkClient = sdk.ClientForMainnet()
	case "testnet":
		sdkClient = sdk.ClientForTestnet()
	case "previewnet":
		sdkClient = sdk.ClientForPreviewnet()
	default:
		return nil, fmt.Errorf("unsupported network: %s", cfg.HederaNetwork)
	}

	sdkClient.SetOperator(operatorID, operatorKey)

	return &Client{
		sdkClient:     sdkClient,
		OperatorID:    operatorID,
		operatorKey:   operatorKey,
		TopicID:       topicID,
		MirrorNodeURL: cfg.MirrorNodeURL,
	}, nil
}

// Close gracefully closes the underlying SDK client.
func (c *Client) Close() error {
	return c.sdkClient.Close()
}