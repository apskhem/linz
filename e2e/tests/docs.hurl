# The health check, the generated OpenAPI spec and the docs page.

GET {{base_url}}/health
HTTP 200
[Asserts]
header "Content-Type" == "application/json"
jsonpath "$.status" == "ok"


GET {{base_url}}/openapi.json
HTTP 200
[Asserts]
jsonpath "$.openapi" == "3.1.0"
jsonpath "$.info.title" == "Notes API"
jsonpath "$.paths['/notes/{id}'].get.operationId" == "getNote"
# path parameters are always required
jsonpath "$.paths['/notes/{id}'].get.parameters[0].required" == true
# a defaulted body field is optional for clients
jsonpath "$.components.schemas.CreateNoteRequestBody.required" count == 1
jsonpath "$.components.schemas.GetNoteOkResponse" exists
jsonpath "$.components.securitySchemes.bearer.scheme" == "bearer"
jsonpath "$.components.securitySchemes.apiKey.in" == "header"
jsonpath "$.tags" count == 1


GET {{base_url}}/docs
HTTP 200
[Asserts]
header "Content-Type" == "text/html"
body contains "<title>Notes API</title>"
body contains "data-url=\"/openapi.json\""
body contains "integrity=\"sha384-"
