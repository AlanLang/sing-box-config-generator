#!/bin/bash

echo "=== Subscribe Feature API Test ==="
echo ""

# Clean up
echo "1. Cleaning up existing subscribes..."
rm -rf data/subscribes
echo "   ✓ Cleanup complete"
echo ""

# Test 1: List (empty)
echo "2. Testing GET /api/subscribe (should be empty)..."
result=$(curl -s http://localhost:3005/api/subscribe)
if [ "$result" = "[]" ]; then
  echo "   ✓ Empty list returned"
else
  echo "   ✗ Failed: $result"
fi
echo ""

# Test 2: Create
echo "3. Testing POST /api/subscribe (create)..."
uuid="550e8400-e29b-41d4-a716-446655440000"
result=$(curl -s -X POST http://localhost:3005/api/subscribe \
  -H "Content-Type: application/json" \
  -d "{
    \"uuid\": \"$uuid\",
    \"name\": \"Test Subscribe\",
    \"json\": \"{\\\"subscription_url\\\":\\\"https://httpbin.org/base64/SGVsbG8gV29ybGQh\\\",\\\"website_url\\\":\\\"https://example.com\\\",\\\"content\\\":\\\"\\\",\\\"last_updated\\\":null}\"
  }")
if [[ "$result" == *"successfully"* ]]; then
  echo "   ✓ Subscribe created"
else
  echo "   ✗ Failed: $result"
fi
echo ""

# Test 3: List (with data)
echo "4. Testing GET /api/subscribe (should have 1 item)..."
count=$(curl -s http://localhost:3005/api/subscribe | jq 'length')
if [ "$count" = "1" ]; then
  echo "   ✓ List returned 1 item"
else
  echo "   ✗ Failed: Expected 1, got $count"
fi
echo ""

# Test 4: Refresh
echo "5. Testing POST /api/subscribe/refresh..."
result=$(curl -s -X POST "http://localhost:3005/api/subscribe/refresh?uuid=$uuid")
if [[ "$result" == *"successfully"* ]]; then
  echo "   ✓ Subscribe refreshed"
else
  echo "   ✗ Failed: $result"
fi
echo ""

# Test 5: Verify content updated
echo "6. Verifying content was fetched..."
content=$(curl -s http://localhost:3005/api/subscribe | jq -r '.[0].json' | jq -r '.content')
if [ "$content" = "Hello World!" ]; then
  echo "   ✓ Content fetched correctly: '$content'"
else
  echo "   ✗ Failed: Expected 'Hello World!', got '$content'"
fi
echo ""

# Test 6: Update
echo "7. Testing PUT /api/subscribe (update name)..."
result=$(curl -s -X PUT http://localhost:3005/api/subscribe \
  -H "Content-Type: application/json" \
  -d "{
    \"uuid\": \"$uuid\",
    \"name\": \"Updated Subscribe\",
    \"json\": \"{\\\"subscription_url\\\":\\\"https://httpbin.org/base64/SGVsbG8gV29ybGQh\\\",\\\"website_url\\\":\\\"https://example.com\\\",\\\"content\\\":\\\"Hello World!\\\",\\\"last_updated\\\":\\\"2026-02-05T06:10:04.915013+00:00\\\"}\"
  }")
if [[ "$result" == *"successfully"* ]]; then
  echo "   ✓ Subscribe updated"
else
  echo "   ✗ Failed: $result"
fi
echo ""

# Test 7: Verify update
echo "8. Verifying name was updated..."
name=$(curl -s http://localhost:3005/api/subscribe | jq -r '.[0].name')
if [ "$name" = "Updated Subscribe" ]; then
  echo "   ✓ Name updated correctly: '$name'"
else
  echo "   ✗ Failed: Expected 'Updated Subscribe', got '$name'"
fi
echo ""

# Test 8: Delete
echo "9. Testing DELETE /api/subscribe..."
result=$(curl -s -X DELETE "http://localhost:3005/api/subscribe?uuid=$uuid")
if [[ "$result" == *"successfully"* ]]; then
  echo "   ✓ Subscribe deleted"
else
  echo "   ✗ Failed: $result"
fi
echo ""

# Test 9: Verify deletion
echo "10. Verifying subscribe was deleted..."
count=$(curl -s http://localhost:3005/api/subscribe | jq 'length')
if [ "$count" = "0" ]; then
  echo "   ✓ List is empty after deletion"
else
  echo "   ✗ Failed: Expected 0, got $count"
fi
echo ""

echo "=== All Tests Complete ==="
