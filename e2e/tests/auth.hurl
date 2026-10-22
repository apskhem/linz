# Security requirements are alternatives, checked before the body is read.

POST {{base_url}}/notes
{
  "title": "No credentials"
}
HTTP 401
[Asserts]
# the first failing security is reported
jsonpath "$.errors[0].detail" == "A valid bearer token is required"


POST {{base_url}}/notes
Authorization: Bearer wrong-token
{
  "title": "Wrong token"
}
HTTP 401


POST {{base_url}}/notes
x-api-key: key-123
{
  "title": "Via API key"
}
HTTP 201
[Asserts]
jsonpath "$.author" == "service"


# an unauthenticated request is rejected without parsing its body
POST {{base_url}}/notes
Content-Type: application/json
`{ not json`
HTTP 401
