# BuildTrack — full runnable website

This version avoids native SQLite dependencies so it runs on modern Node.js 24 on Windows without Visual Studio C++ build tools.

## Run
1. Open PowerShell in this `buildtrack-full` folder.
2. Run `npm install`
3. Run `npm start`
4. Open http://localhost:3000

## Demo accounts
- Admin: aarti@buildtrack.demo / buildtrack
- Site Manager: arjun@buildtrack.demo / buildtrack
- Site Manager: meera@buildtrack.demo / buildtrack
- Customer: rahul@buildtrack.demo / buildtrack
- Customer: sneha@buildtrack.demo / buildtrack
- Customer: vikram@buildtrack.demo / buildtrack

## Data
The server stores application data in `buildtrack-data.json` and uploaded site photos in `public/uploads/`.

## Why this build was changed
The previous build used `better-sqlite3`, a native Node module. On Node 24 it may require a matching prebuilt binary or local C++ build tools. This build uses a JSON-backed data store instead, while keeping the same API and user-facing workflows.
