# API Documentation

## Endpoints

### `GET /api/todos`
Returns all todos with dependencies and critical path data

### `POST /api/todos`
```json
{
  "title": "string",
  "dueDate": "YYYY-MM-DD",
  "estimatedDays": 1-365,
  "dependencies": [1, 2]
}
POST /api/todos/[id]/dependencies
Creates dependency relationship
DELETE /api/todos/[id]/dependencies?dependsOnId=X
Removes dependency
GET /api/todos/critical-path
Returns critical path calculation with schedule data
POST /api/todos/[id]/image
Triggers image generation for task
