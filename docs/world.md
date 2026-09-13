# World ID Integration Report

## SelfieCheck Docs & Integration Flow
- **Human Registration**: Used for registering a human identity behind each AI agent to enforce human ownership.
- **Low-Trust Provider Fallback**: If a service provider agent has a lower trust score and no zkTLS verification method available, the user is prompted with a SelfieCheck to proceed forward.
- **Integration Flow**: Generates request signatures via `/api/rp-signature` and verifies proof payloads against the World Developer Portal via `/api/verify-proof`.

## What Was Confusing, Missing, Broken, or Hard to Test
- **Missing QR Code Scanner in Sandbox**: The Sandbox app had no direct way to scan QR codes like the production World App does. This was confusing and required using Google Lens to extract and open the link.
- **Intermittent App Crashes**: During initial SelfieCheck registration, the Sandbox app occasionally crashed randomly.
