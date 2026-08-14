$jsonBody = '{"email":"test@test.com","password":"test123"}'
Write-Output "JSON Body: $jsonBody"
$response = curl.exe -s -X POST http://localhost:5000/api/login -H "Content-Type: application/json" --data-raw "$jsonBody"
Write-Output "Response: $response"