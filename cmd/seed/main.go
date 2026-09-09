package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"proof402/config"
	"proof402/internal/hcs"
	"proof402/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("failed to load .env : ",err)
	}

	cfg, err := config.LoadConfig("config.json")
	if err != nil {
		log.Fatalf("Failed to load config.json: %v", err)
	}

	opID := os.Getenv("OPERATOR_ID")
	opKey := os.Getenv("OPERATOR_KEY")

	hcsClient, err := hcs.NewClient(cfg,opID,opKey)
	if err != nil {
		log.Fatalf("Client setup failed: %v", err)
	}
	defer hcsClient.Close()

	fmt.Printf("Connected to Hedera Testnet [Operator: %s]\n", hcsClient.OperatorID.String())
	// 3. Subscribe to Topic using method call

	topic,err:=hcs.ParseTopicID(cfg.TopicID);if err!=nil{
		log.Fatal("error parsing topic id",err)
	}
	_, err = hcsClient.SubscribeToTopic(topic, func(msg []byte, seq uint64) {
		fmt.Printf("\n[MIRROR NODE STREAM] Received Seq #%d: %s\n", seq, string(msg))
	})
	if err != nil {
		log.Fatalf("Subscribe failed: %v", err)
	}

	time.Sleep(2 * time.Second)

	// 4. Post Agent Card using method call
	agentCard := models.HCS14AgentCard{
		P:           "hcs-14",
		Op:          "register",
		Name:        "Struct-Based Proxy Agent",
		Description: "A2A Proxy routing agent using object-oriented Go SDK layer.",
		Endpoints:   []string{"https://proxy.marketplace.com/v1"},
		MetaData: map[string]string{
			"price": "0.01 HBAR",
			"owner": hcsClient.OperatorID.String(),
		},
	}

	payload, _ := json.Marshal(agentCard)
	seqNum, err := hcsClient.PostToTopic(payload)
	if err != nil {
		log.Fatalf("Post message failed: %v", err)
	}

	fmt.Printf("Successfully published message! Sequence Number: %d\n", seqNum)

	time.Sleep(3 * time.Second)
	// Fetch all messages from the topic via Mirror Node REST API
	messages, err := hcsClient.GetTopicMessages()
	if err != nil {
	    log.Fatalf("Failed to retrieve topic messages: %v", err)
	}

	fmt.Printf("\n--- Retrieved %d messages from Topic %s ---\n", len(messages), cfg.TopicID)
	for _, msg := range messages {
	    fmt.Printf("Seq #%d | Payload: %s\n", msg.SequenceNumber, string(msg.Payload))
	}
}