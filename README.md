# BuildTrack — Full-stack construction tracking website

BuildTrack is a role-based construction operations and customer communication system for Aarti's construction company.

## What is implemented

### Separate portals
- **Admin portal:** all projects, all homes, delivery/ETA, risks, tasks, daily updates, customer change requests, team and reports.
- **Site Manager portal:** assigned sites only; homes, construction stages, daily updates + photos, tasks and issues.
- **Customer portal:** only the customer's own home; live stage, progress, expected handover, daily updates/photos, customization requests and handover scope.

### Construction model
- Apartment complexes, villas, villaments and independent homes.
- Each unit is tracked independently even when it belongs to the same project.
- Packages: **Bare-Bone**, **Semi-Finished**, **Fully Finished**.
- Handover scope is package-specific:
  - Bare-Bone → Cladding
  - Semi-Finished → Painting
  - Fully Finished → Final Inspection
- Construction lifecycle: Foundation → Structure → Walls → Cladding → Plumbing → Electrical → Painting → Flooring → Interiors → Final Inspection.

### Real workflow features
- Daily site updates with **photo upload**.
- Customer notifications when a stage/update/customization/task changes.
- Customization/change requests with status and estimated cost/time impact.
- Issue/risk register with delivery impact days.
- Tasks and schedule with assignees and status progression.
- ETA calculation: base delivery + approved/in-progress customization impact + open/monitored issue impact + existing delay days.
- Portfolio report and CSV export.
- SQLite database and server-side sessions.

## Demo accounts
Password for all demo users: `buildtrack`

- Admin: `aarti@buildtrack.demo`
- Site Manager: `arjun@buildtrack.demo`
- Site Manager: `meera@buildtrack.demo`
- Customer: `rahul@buildtrack.demo`
- Customer: `sneha@buildtrack.demo`
- Customer: `vikram@buildtrack.demo`

## Run locally
1. Install Node.js 18+.
2. Open this folder in Terminal / Command Prompt.
3. Run:
   ```
   npm install
   npm start
   ```
4. Open `http://localhost:3000`.

The SQLite database `buildtrack.db` is created automatically on first run.

## Production hardening still recommended
For an actual company deployment, add HTTPS, a strong environment secret, secure cookie settings, CSRF protection, password reset/MFA, cloud object storage for photos, backups, audit logs, email/SMS/push notifications, granular permissions and a managed database.
