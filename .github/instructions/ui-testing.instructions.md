---
description: General instructions for testing the UI of the application
---

# Overview

These instructions are for testing the UI of the application.

## Opening the UI

- There should be a server already running. Generally it runs on port 3005
- Use playwright and navigate to http://localhost:3005/ to begin testing

## Tests

### Create a new connection

1. Go to the home page (http://localhost:3005/).
2. Click the “New” button.
3. In the dialog, enter a connection name (e.g., “Test Connection”).
4. Fill in connection details as needed (type, host, port, etc.).
5. Click “Save”.
6. Click “Close” to dismiss the dialog.
7. Confirm the new connection appears in the list.

Note: There's a script called `seed` in package.json. It should generate a state.local.sqlite database for testing purposes if not present.

### Delete a connection
