#!/bin/bash
# Test subscription link parsing functionality

echo "=== Testing Subscription Link Parser ==="
echo ""

# Test Shadowsocks (SIP002 format)
echo "1. Testing Shadowsocks (SIP002)..."
SS_URL="ss://YWVzLTEyOC1nY206dGVzdA==@192.168.100.1:8888#US%20Server%201"
echo "URL: $SS_URL"
echo "Expected: method=aes-128-gcm, password=test, server=192.168.100.1, port=8888, tag=US Server 1"
echo ""

# Test Trojan
echo "2. Testing Trojan..."
TROJAN_URL="trojan://password123@example.com:443?security=tls&sni=example.com#HK%20Server"
echo "URL: $TROJAN_URL"
echo "Expected: password=password123, server=example.com, port=443, tls enabled, tag=HK Server"
echo ""

# Test VMess
echo "3. Testing VMess..."
VMESS_JSON='{"v":"2","ps":"SG Node","add":"sg.example.com","port":"443","id":"b831381d-6324-4d53-ad4f-8cda48b30811","aid":"0","net":"ws","type":"none","host":"sg.example.com","path":"/path","tls":"tls","sni":"sg.example.com"}'
VMESS_BASE64=$(echo -n "$VMESS_JSON" | base64 -w 0)
VMESS_URL="vmess://${VMESS_BASE64}"
echo "URL: vmess://[base64 json]"
echo "Expected: server=sg.example.com, port=443, uuid=b831381d-6324-4d53-ad4f-8cda48b30811, websocket transport"
echo ""

# Test VLESS
echo "4. Testing VLESS..."
VLESS_URL="vless://b831381d-6324-4d53-ad4f-8cda48b30811@example.com:443?encryption=none&security=tls&sni=example.com&type=ws&path=%2Fpath#JP%20Node"
echo "URL: $VLESS_URL"
echo "Expected: uuid=b831381d-6324-4d53-ad4f-8cda48b30811, server=example.com, port=443, tls enabled, websocket transport, tag=JP Node"
echo ""

echo "=== Manual Testing Instructions ==="
echo ""
echo "1. Create a subscription with test links above"
echo "2. Create a filter to match the subscription"
echo "3. Add the filter to an outbound group"
echo "4. Generate and download the config"
echo "5. Check if the outbound entries have complete server/port/password information"
echo ""
echo "Example subscription content (base64 encoded):"
echo "----------------------------------------"
TEST_CONTENT="${SS_URL}
${TROJAN_URL}
${VMESS_URL}
${VLESS_URL}"
echo "$TEST_CONTENT" | base64 -w 0
echo ""
echo "----------------------------------------"
