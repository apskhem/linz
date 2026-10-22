# Error responses of the framework.

GET {{base_url}}/notes/does-not-exist
HTTP 404
[Asserts]
jsonpath "$.errors[0].status" == "404"
jsonpath "$.errors[0].detail" == "Note does-not-exist not found"


GET {{base_url}}/no/such/route?with=query
HTTP 404
[Asserts]
jsonpath "$.errors[0].detail" == "Cannot find GET /no/such/route"


# unexpected errors are logged, never shown to clients
GET {{base_url}}/boom
HTTP 500
[Asserts]
jsonpath "$.errors[0].detail" == "Internal server error"
body not contains "hunter2"
