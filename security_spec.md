# security_spec.md
## AegisAI Zero-Trust Database Security Specification

This document details the Zero-Trust security invariants, protection matrices ("Dirty Dozen" attack vectors), and automated rules validating database accesses.

### 1. Data Invariants
- **Profile Ownership**: A user profile document `/users/{userId}` can only be read or written by the user authenticated with UID matching `{userId}`.
- **Audit Trails**: Security logs in `/users/{userId}/securityLogs/{logId}` can only be appended (created) during active operator sessions. Updates or deletions of security logs are strictly forbidden to preserve audit trail tamper resistance.
- **Transaction Records**: Historical trade structures in `/users/{userId}/trades/{tradeId}` and neural insights in `/users/{userId}/memories/{memoryId}` represent immutable archived ledger data. They can be created and read by the authenticated path owner, but never modified or deleted.

---

### 2. The "Dirty Dozen" Payloads
The following payloads are structured to maliciously bypass authentication constraints, escalate privileges, inject junk payloads, or mutate absolute record histories. All must be rejected by the security layer (`PERMISSION_DENIED`).

#### Attack Vector 1: Identity Spoofing (Write other user's profile)
- **Path**: `/users/legit-operator-id`
- **Request UID**: `attacker-uid`
- **Payload**:
```json
{
  "name": "Intruder User",
  "email": "attacker@evil.com",
  "avatar": "red",
  "registeredAt": "2026-06-02T01:30:00Z",
  "role": "Chief Risk Officer"
}
```

#### Attack Vector 2: Privilege Escalation (Self-assigned high security clearance)
- **Path**: `/users/operator-uid`
- **Request UID**: `operator-uid` (matching)
- **Payload**:
```json
{
  "name": "Junior Trader",
  "role": "Super Admin Bypass",
  "email": "junior@aegis.ai",
  "avatar": "indigo",
  "registeredAt": "2026-06-02T01:30:00Z"
}
```

#### Attack Vector 3: Shadow Update / Ghost field injection on user profile
- **Path**: `/users/operator-uid`
- **Request UID**: `operator-uid`
- **Action**: Update
- **Payload**:
```json
{
  "name": "Junior Trader",
  "email": "junior@aegis.ai",
  "avatar": "indigo",
  "registeredAt": "2026-06-02T01:30:00Z",
  "role": "Senior Portfolio Analyst",
  "systemBypassKey": "TRUE_EXPLOIT"
}
```

#### Attack Vector 4: Security Log Tampering (Modifying established security logs)
- **Path**: `/users/operator-uid/securityLogs/log-old`
- **Request UID**: `operator-uid`
- **Action**: Update
- **Payload**:
```json
{
  "event": "Overwrote warning: Intrusion attempt cleared",
  "ip": "127.0.0.1",
  "timestamp": "2026-06-02T01:05:00Z"
}
```

#### Attack Vector 5: Audit Deletion (Erasing historical evidence)
- **Path**: `/users/operator-uid/securityLogs/log-alert`
- **Request UID**: `operator-uid`
- **Action**: Delete

#### Attack Vector 6: Historical Trade Mutation (Retroactive ledger profit cooking)
- **Path**: `/users/operator-uid/trades/trade-1234`
- **Request UID**: `operator-uid`
- **Action**: Update
- **Payload**:
```json
{
  "pnl": 99999999,
  "pnlPercent": 2500,
  "status": "profit"
}
```

#### Attack Vector 7: Relational Orphan Mapping (Writing log under fake UID)
- **Path**: `/users/non-existent-or-victim-uid/securityLogs/log-new`
- **Request UID**: `attacker-uid`
- **Action**: Create
- **Payload**:
```json
{
  "id": "log-new",
  "event": "Spoofed alert",
  "ip": "100.100.100.100",
  "timestamp": "2026-06-02T01:30:00Z"
}
```

#### Attack Vector 8: Resource Poisoning via massive document ID
- **Path**: `/users/operator-uid/securityLogs/A_VERY_LONG_STRING_OVER_1000_CHARACTERS_THAT_SHOULD_EXHAUST_RESOURCES_AND_DOS_THE_KEYRING`
- **Request UID**: `operator-uid`
- **Action**: Create
- **Payload**:
```json
{
  "id": "A_VERY_LONG_STRING...",
  "event": "Junk",
  "ip": "1.1.1.1",
  "timestamp": "2026-06-02T01:30:00Z"
}
```

#### Attack Vector 9: Unsigned profile reading (Public access leak)
- **Path**: `/users/operator-uid`
- **Request UID**: null (unauthenticated)
- **Action**: Get

#### Attack Vector 10: System-generated insight injection (Forging smart insights)
- **Path**: `/users/operator-uid/memories/fake-memory`
- **Request UID**: `attacker-uid` (different)
- **Action**: Create
- **Payload**:
```json
{
  "id": "fake-memory",
  "symbol": "BTCUSD",
  "strategy": "System AI Hack",
  "regime": "Exploited",
  "pnl": 10000000,
  "type": "win",
  "details": "Fake injection logs indicating fake profits",
  "timestamp": "2026-06-02T01:30:00Z"
}
```

#### Attack Vector 11: Invalid trade schema properties
- **Path**: `/users/operator-uid/trades/trade-bad`
- **Request UID**: `operator-uid`
- **Action**: Create
- **Payload**:
```json
{
  "id": "trade-bad",
  "symbol": "EURUSD",
  "assetClass": "invalid_asset_class",
  "direction": "upwards",
  "size": "not-a-number",
  "entryPrice": -50,
  "exitPrice": 1.1235,
  "pnl": 100,
  "pnlPercent": 1.2,
  "status": "active",
  "timestamp": "2026-06-02T01:30:00Z",
  "execTime": "2026-06-02T01:32:00Z"
}
```

#### Attack Vector 12: Unverified Operator Bypass (Bypassing verification status check)
- **Path**: `/users/operator-uid`
- **Request UID**: `operator-uid`
- **Auth Token Claims**: `{ "email_verified": false }`
- **Action**: Create
- **Payload**:
```json
{
  "name": "Unverified Operator",
  "email": "unverified@aegis.ai",
  "avatar": "zinc",
  "registeredAt": "2026-06-02T01:30:00Z",
  "role": "Junior Analyst"
}
```

---

### 3. The Test Runner Reference
All 12 attacks are guaranteed to yield Permission Denied through rigid ruleset structure. No shadow mutations can occur bypass.
