# Text, url-encoded and multipart request bodies, and content type checks.

POST {{base_url}}/notes
Authorization: Bearer secret-token
{
  "title": "Body types"
}
HTTP 201
[Captures]
note_id: jsonpath "$.id"


PUT {{base_url}}/notes/{{note_id}}/content
Authorization: Bearer secret-token
Content-Type: text/plain
`Plain text content`
HTTP 200
[Asserts]
header "Content-Type" == "text/plain"
body == "Plain text content"


GET {{base_url}}/notes/{{note_id}}
HTTP 200
[Asserts]
jsonpath "$.content" == "Plain text content"


# repeated keys are kept as multiple values
POST {{base_url}}/notes/import
x-api-key: key-123
[Form]
title: Imported one
title: Imported two
HTTP 201
[Asserts]
jsonpath "$.created" count == 2
jsonpath "$.created[1].title" == "Imported two"
jsonpath "$.created[0].author" == "service"


POST {{base_url}}/notes/{{note_id}}/attachments
Authorization: Bearer secret-token
[Multipart]
label: greeting
file: file,hello.txt; text/plain
HTTP 201
[Asserts]
jsonpath "$.label" == "greeting"
jsonpath "$.name" == "hello.txt"
jsonpath "$.size" == 19


# a body in another content type than the declared one
POST {{base_url}}/notes
Authorization: Bearer secret-token
Content-Type: application/x-www-form-urlencoded
`title=Wrong+type`
HTTP 415
[Asserts]
jsonpath "$.errors[0].detail" == "'application/x-www-form-urlencoded' content type is not supported, expected 'application/json'"


POST {{base_url}}/notes
Authorization: Bearer secret-token
{
  "title": ""
}
HTTP 400
[Asserts]
header "Content-Type" == "application/json"
jsonpath "$.errors[0].meta.in" == "body"
