# DB Explorer

A modern, user-friendly application for exploring and traversing unknown databases. Built with Next.js and Electron.

![PostgreSQL Support](https://img.shields.io/badge/PostgreSQL-✓-success)
![More Databases Coming](https://img.shields.io/badge/More%20Databases-Coming%20Soon-blue)

## Features

- 🔍 Intuitive database navigation
- 📊 Visual representation of database schema
- 🐘 PostgreSQL support (with more databases coming soon)
- ⚡ Built on Electron for cross-platform compatibility
- 🚀 Modern UI powered by Next.js

# Installation

Download the latest release (currently not yet published to GitHub Releases).

## Quarantine

You'll get a warning from macOS about the app being damaged if you try to run it.

This is because the app is not signed, and has been quarantined by macOS. You can see the quarantine status by running the following command:

```bash
xattr -l DB\ Explorer.app
```

You'll see something like this:

```bash
com.apple.quarantine: 0181;1721990400;DB Explorer
```


To get around this, you can run the following command to remove the quarantine status:

```bash
xattr -d com.apple.quarantine DB\ Explorer.app
```

Now the app should run.

# Development

## Prerequisites

- Node.js (v23 or higher recommended)
- npm
- PostgreSQL database (for testing/development)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tarwich/db-explorer.git
cd db-explorer
```

2. Install dependencies:
```bash
npm install
```

## Running the application

To run the application in development mode:

```bash
npm run dev
```

This will start both the Next.js development server and the Electron application.


## Run a test database

Start a postgres container:

```bash
docker compose up -d postgres
```

Run the seed script to populate the database with data:

```bash
node scripts/seed.ts
```

Get the port of the postgres container:

Run the following command and look for something like this
`0.0.0.0:54590->5432`. Whatever points to 5432 is your local postgres port. If
you see that, then `54590` is the local port, which you'll need in the
connection string below.

```bash
docker compose ps
```

Connection string: (replace `54590` with your local postgres port)

```bash
postgres://postgres:postgres@localhost:54590/postgres
```

## Contributing

Contributions are welcome! Here are some ways you can contribute:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📝 Improve documentation
- 🗃️ Add support for additional databases

## Roadmap

- [ ] Refactor interface to make navigation easier
- [ ] Add support for MySQL
- [ ] Add support for SQLite

## License

[MIT](LICENSE)
