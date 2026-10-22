# Creating, reading, filtering and exporting notes.

POST {{base_url}}/notes
Authorization: Bearer secret-token
# declared as `X-Request-Id`, matched case-insensitively
x-request-id: req-42
{
  "title": "Shopping list",
  "tags": ["e2e-notes", "pinned"]
}
HTTP 201
[Captures]
note_id: jsonpath "$.id"
[Asserts]
header "x-request-id" == "req-42"
jsonpath "$.title" == "Shopping list"
jsonpath "$.author" == "alice"
jsonpath "$.content" == ""


POST {{base_url}}/notes
Authorization: Bearer secret-token
{
  "title": "Untagged"
}
HTTP 201
[Asserts]
# the default applies when the field is omitted
jsonpath "$.tags" count == 0


GET {{base_url}}/notes/{{note_id}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{note_id}}"
jsonpath "$.tags" contains "pinned"


GET {{base_url}}/notes
[Query]
tag: e2e-notes
tag: pinned
HTTP 200
[Asserts]
jsonpath "$.items" count == 1
jsonpath "$.items[0].title" == "Shopping list"


GET {{base_url}}/notes/export
HTTP 200
[Asserts]
header "Content-Type" == "text/plain"
body contains "{{note_id}}\tShopping list\n"
