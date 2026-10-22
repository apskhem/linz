# Example requests against a running server (`npm run dev`), run with:
#   npx @orangeopensource/hurl --test --variable base_url=http://localhost:3000 requests.hurl
# Add `--very-verbose` to see every request and response.

GET {{base_url}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"


# creating a note requires the bearer token
POST {{base_url}}/v1/notes
{
  "title": "Groceries"
}
HTTP 401


POST {{base_url}}/v1/notes
Authorization: Bearer dev-token
{
  "title": "Groceries",
  "content": "Milk, eggs",
  "tags": ["home"]
}
HTTP 201
[Captures]
note_id: jsonpath "$.id"
[Asserts]
jsonpath "$.title" == "Groceries"


# invalid input is rejected with the validation issues
POST {{base_url}}/v1/notes
Authorization: Bearer dev-token
{
  "title": ""
}
HTTP 400
[Asserts]
jsonpath "$.errors[0].meta.in" == "body"


GET {{base_url}}/v1/notes/{{note_id}}
HTTP 200
[Asserts]
jsonpath "$.content" == "Milk, eggs"


GET {{base_url}}/v1/notes
[Query]
tag: home
HTTP 200
[Asserts]
jsonpath "$.items[*].id" contains "{{note_id}}"


PUT {{base_url}}/v1/notes/{{note_id}}
Authorization: Bearer dev-token
{
  "title": "Groceries",
  "content": "Milk, eggs, bread"
}
HTTP 200
[Asserts]
jsonpath "$.content" == "Milk, eggs, bread"
# fields left out take their defaults
jsonpath "$.tags" count == 0


POST {{base_url}}/v1/notes/{{note_id}}/attachments
Authorization: Bearer dev-token
[Multipart]
file: file,README.md; text/markdown
HTTP 201
[Asserts]
jsonpath "$.name" == "README.md"
jsonpath "$.type" == "text/markdown"


DELETE {{base_url}}/v1/notes/{{note_id}}
Authorization: Bearer dev-token
HTTP 204


GET {{base_url}}/v1/notes/{{note_id}}
HTTP 404
[Asserts]
jsonpath "$.errors[0].detail" == "Note {{note_id}} not found"
