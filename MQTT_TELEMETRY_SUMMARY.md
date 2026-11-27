# IPMR Dashboard Telemetry Implementation - Complete Summary

**Status:** ✅ Core Implementation Complete

This document provides a complete overview of the MQTT telemetry system that has been implemented for the Industrial PMR Dashboard.

## 📋 What Has Been Implemented

### 1. ✅ Secure MQTT Configuration System
**Location:** `src/Services/mqtt/config.ts`

- Environment variable loading from `.env` file
- Automatic validation of broker URL, port, and credentials  
- Configuration validation with helpful error messages
- Support for both TCP (mqtt/mqtts) and WebSocket (ws/wss) protocols
- Automatic client ID generation if not provided
- Topic construction helpers for telemetry and downlink topics

**Key Features:**
```typescript
- loadMqttConfig() - Load and validate configuration
- buildMqttUrl() - Construct connection URL
- getTelemetryTopic() - Get topic for device
- getDownlinkTopic() - Get command topic for device
- validateTopic() - Validate MQTT topic format
```

### 2. ✅ MQTT Client Service
**Location:** `src/Services/mqtt/client.ts`

- Singleton MQTT client that manages a single connection for the entire app
- Automatic connection lifecycle management
- Subscription handling with callback system
- Keep-alive mechanism (publishes to downlink every 15-20 seconds)
- Graceful cleanup on disconnection
- Comprehensive error handling and logging

**Key Methods:**
```typescript
mqttClient.connect()                    // Connect to broker
mqttClient.disconnect()                 // Disconnect gracefully
mqttClient.subscribeTelemetry(deviceId) // Subscribe + activate stream
mqttClient.unsubscribeTelemetry(deviceId) // Unsubscribe + stop stream
mqttClient.onTelemetry(callback)        // Register telemetry callback
mqttClient.onConnectionStatusChange()   // Listen to connection events
```

**Payload Types:**
```typescript
// Incoming telemetry from device
{
  "action": "REALTIME_VALUES",
  "data": {
    "I_R": 10.5,
    "V_RN": 230.1,
    "SUM_W": 4500,
    "timestamp": 1713800000,
    "using_external_rtc": true
  }
}

// Outgoing keep-alive messages
{
  "action": "KEEP_ALIVE",
  "data": {}
}

// Initial activation command
{
  "action": "TELEMETRY_SUB",
  "data": {}
}
```

### 3. ✅ React Integration Hooks
**Location:** `src/Services/mqtt/hooks.ts`

Complete set of React hooks for easy integration:

```typescript
// Main hook - use this one for most cases
useDeviceTelemetry(deviceId: DeviceIdentifiers | null)
  Returns: { isConnected, isLiveActive, telemetryValues, formattedTimestamp, rtcStatus, error, ... }

// Individual hooks for advanced usage
useMqttConnection()           // Connection state management
useMqttTelemetry(deviceId)    // Subscription management  
useParsedTelemetry(deviceId)  // Telemetry parsing + RTC handling
useFormattedTimestamp(date)   // Timestamp formatting utility
```

**Key Features:**
- Automatic MQTT connection initialization (only once in app)
- Subscription lifecycle management (subscribe on mount, unsubscribe on unmount)
- Proper cleanup to prevent memory leaks
- Keep-alive automatically stops when component unmounts
- Timestamp parsing with timezone support
- RTC sync status detection

### 4. ✅ Live Telemetry Status Component
**Location:** `src/routes/Machines/Machine/Power/AntDesign/LiveTelemetryStatus.tsx`

A premium UI component that displays real-time telemetry status with:

**Visual Indicators:**
- 🟢 Pulsing green dot when telemetry stream is active
- ⚠️ Status badges for connection state (Connected, Connecting, Disconnected)
- 🔔 RTC sync status badge with icon (Synced, Out of Sync, Unknown)
- ⏱️ Last telemetry timestamp in human-readable format
- ❌ Error display with helpful messages

**Features:**
- Responsive design (works on mobile and desktop)
- Dark mode support with Chakra UI
- Smooth pulsing animation using CSS keyframes
- Tooltips with helpful information
- Zero-dependency component (uses only Chakra UI)

### 5. ✅ Environment Configuration
**Files:**
- `.env` - Development configuration with MQTT variables
- `.env.example` - Template with comprehensive documentation

**Supported Variables:**
```env
REACT_APP_MQTT_BROKER_URL=mqtt://your-broker.com
REACT_APP_MQTT_PORT=8883
REACT_APP_MQTT_USERNAME=your_username
REACT_APP_MQTT_PASSWORD=your_password
REACT_APP_MQTT_PROTOCOL=wss
REACT_APP_MQTT_KEEPALIVE_INTERVAL=15000
REACT_APP_MQTT_CLEAN_SESSION=true
REACT_APP_MQTT_CONNECT_TIMEOUT=30000
REACT_APP_MQTT_RECONNECT_PERIOD=1000
REACT_APP_MQTT_CLIENT_ID=custom_id
```

### 6. ✅ Documentation
**Files:**
- `src/Services/mqtt/README.md` - Comprehensive service documentation
- `src/Services/mqtt/INTEGRATION_GUIDE.ts` - Integration instructions with examples
- `src/routes/Machines/Machine/Power/AntDesign/MQTT_INTEGRATION_REFERENCE.ts` - Code snippets for PowerDashboard integration

## 🚀 Quick Start

### 1. Installation
Package already in `package.json`:
```bash
bun install  # or npm install
```

### 2. Configuration
Update `.env` file:
```env
REACT_APP_MQTT_BROKER_URL=mqtt://your-broker-url
REACT_APP_MQTT_PORT=8883
REACT_APP_MQTT_USERNAME=your_username
REACT_APP_MQTT_PASSWORD=your_password
```

### 3. Integration into PowerDashboard
See `MQTT_INTEGRATION_REFERENCE.ts` for exact code changes needed.

Quick steps:
1. Import `LiveTelemetryStatus` and `useDeviceTelemetry`
2. Add state for `deviceId: DeviceIdentifiers | null`
3. Fetch device KEY and MAC from Firebase
4. Render `<LiveTelemetryStatus deviceId={deviceId} />`
5. Keep-alive automatically manages itself

## 🔄 Data Flow

```
Device (IPMR225)
     |
     | (publishes telemetry every N seconds)
     v
MQTT Broker
     |
     | (subscribes via Subscription)
     v
MQTT Client Service
     |
     | (parses JSON + calls callbacks)
     v
React Hooks
     |
     | (processes RTC timestamp)
     v
UI Components
     |
     | (displays live data + status)
     v
User Dashboard
```

## 🔌 Architecture Diagram

```
PowerDashboard Component
    |
    ├─ useDeviceTelemetry(deviceId)
    │   └─ Automatically handles:
    │       ├─ MQTT Connection
    │       ├─ Topic Subscription
    │       ├─ Keep-Alive Publishing
    │       └─ Data Parsing & RTC Handling
    │
    └─ Renders
        ├─ LiveTelemetryStatus
        │   └─ Displays connection + RTC status
        └─ RealTimeGauges
            └─ Optional: can receive MQTT telemetry data
```

## 🔐 Security Features

✅ **Implemented:**
- All credentials loaded from environment variables (never hardcoded)
- Support for TLS/SSL encryption (wss protocol)
- Message validation and parsing with error handling
- Device identification via KEY and MAC
- Automatic connection cleanup on app/component unmount

⚠️ **Development Mode:**
- `rejectUnauthorized: false` is set for self-signed certificates
- Remove this setting in production with proper certificate setup

## 🧪 Testing

### Local MQTT Broker Setup

**Using Docker:**
```bash
docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto
```

### Test Configuration
```env
REACT_APP_MQTT_BROKER_URL=mqtt://localhost
REACT_APP_MQTT_PORT=1883
REACT_APP_MQTT_PROTOCOL=mqtt
```

### Test with MQTT CLI
```bash
# Subscribe to all devices
mosquitto_sub -h localhost -t "ipmr/+/+/telemetry"

# Publish test data
mosquitto_pub -h localhost \
  -t "ipmr/TEST_KEY/AA:BB:CC:DD:EE:FF/telemetry" \
  -m '{"action":"REALTIME_VALUES","data":{"timestamp":'$(date +%s)',"using_external_rtc":true,"SUM_W":5000}}'
```

### Browser Console Logs
Look for:
```
✅ MQTT connected successfully
Subscribing to telemetry topic: ipmr/...
✅ Published TELEMETRY_SUB activation command
✅ Keep-alive started (interval: 15000ms)
📊 Received telemetry data: {...}
```

## 📦 Dependencies Added

**New Package:**
- `mqtt@^5.3.1` - MQTT client library for JavaScript

**Already in Project:**
- React 18
- Chakra UI
- TypeScript

## 🔄 Keep-Alive Mechanism

**How It Works:**
1. User opens telemetry view → Component mounts
2. Hook automatically subscribes → Sends TELEMETRY_SUB
3. Keep-alive timer starts → Publishes KEEP_ALIVE every 15-20s
4. User closes telemetry view → Component unmounts
5. Hook automatically unsubscribes → Keep-alive timer stops
6. Device detects no keep-alive → Tears down stream after 30s

**Configuration:**
- Default interval: 15,000 ms (15 seconds)
- Device requirement: Less than 30,000 ms
- Recommended: 15,000-20,000 ms

## 🐛 Troubleshooting

### MQTT Won't Connect
1. Check `.env` file has MQTT_BROKER_URL
2. Verify broker is running and accessible
3. Confirm MQTT_PORT is correct
4. Check browser console for errors

### No Telemetry Received
1. Verify device is publishing to: `ipmr/{KEY}/{MAC}/telemetry`
2. Check KEY and MAC are correct
3. Ensure device payload has correct JSON format
4. Confirm timestamp includes both fields: `timestamp` and `using_external_rtc`

### RTC Status Unknown
- Wait for first telemetry message from device
- Check device includes `timestamp` field (Unix time, seconds)
- Verify `using_external_rtc` boolean is in payload

### High Memory Usage
- Ensure components are properly unmounting
- Check that subscriptions are being cleaned up
- Verify keep-alive interval stops on component unmount

## 📚 Module Exports

```typescript
// From src/Services/mqtt

// Configuration
export { loadMqttConfig, buildMqttUrl, getTelemetryTopic, getDownlinkTopic }
export type { MqttConfig }

// Client
export { mqttClient }
export type { TelemetryPayload, DeviceIdentifiers }

// Hooks
export {
  useMqttConnection,
  useMqttTelemetry,
  useParsedTelemetry,
  useFormattedTimestamp,
  useDeviceTelemetry,
}
```

## 🎯 Next Steps for Integration

1. **Determine Device Identifier Storage**
   - Where are KEY and MAC stored in Firebase?
   - Update PowerDashboard's `useEffect` to fetch them

2. **Configure MQTT Broker**
   - Update `.env` with production broker details
   - Set up TLS/SSL certificates if needed

3. **Test End-to-End**
   - Start broker
   - Configure device identifiers
   - Verify telemetry flow
   - Test keep-alive mechanism

4. **Optional: Enhance RealTimeGauges**
   - Pass MQTT telemetry data as props
   - Merge with Firebase data display
   - Add MQTT-specific fields to UI

5. **Deployment**
   - Update environment variables in CI/CD
   - Configure production MQTT broker
   - Enable TLS/SSL certificates
   - Monitor telemetry stream reliability

## 📞 Support

For issues or questions:
1. Check browser console for MQTT logs
2. Review `src/Services/mqtt/README.md` for API reference
3. See `MQTT_INTEGRATION_REFERENCE.ts` for code examples
4. Check `.env.example` for configuration options

---

**Implementation Date:** April 22, 2026
**Status:** ✅ Core Implementation Complete
**Version:** 1.0.0

**What's Ready to Use:**
- ✅ MQTT configuration system
- ✅ Client connection management
- ✅ React hooks for integration
- ✅ Live status component
- ✅ Comprehensive documentation

**What Still Needs Integration:**
- [ ] Determine where device KEY/MAC are stored
- [ ] Update PowerDashboard component
- [ ] Configure production MQTT broker
- [ ] Test end-to-end with real device
