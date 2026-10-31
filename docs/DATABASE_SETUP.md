# NOTARI 2.0 - Local MongoDB Setup & Seeding Guide

This guide details how to configure and connect a MongoDB instance for local development and testing of NOTARI 2.0.

---

## Option 1: MongoDB Community Server (Local Machine)

### Windows
1. Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2. Run the installer and install MongoDB as a Windows Service.
3. Verify that the MongoDB service is running via PowerShell:
   ```powershell
   Get-Service MongoDB
   ```
4. By default, MongoDB listens on `mongodb://localhost:27017`.
5. In your `.env.local`:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/notari_oau
   ```

### macOS (via Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```

---

## Option 2: Docker (Recommended for Isolated Dev)

Run MongoDB in a lightweight Docker container:

```bash
docker run -d \
  --name notari-mongodb \
  -p 27017:27017 \
  -v notari_mongo_data:/data/db \
  mongo:7.0
```

Set in `.env.local`:
```bash
MONGODB_URI=mongodb://localhost:27017/notari_oau
```

---

## Option 3: MongoDB Atlas (Free Cloud Database)

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. In Database Access, create a database user with Read/Write privileges.
3. In Network Access, whitelist your current IP address (or `0.0.0.0/0` for development).
4. Copy the connection string and paste it into `.env.local`:
   ```bash
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/notari_oau?retryWrites=true&w=majority
   ```

---

## Development Account Seeding (`npm run db:seed`)

The database seeder initializes 3 development accounts:
1. **Superadmin** (`admin@notari.oau.edu.ng`)
2. **Organizer** (`organizer@notari.oau.edu.ng`)
3. **Student** (`student@notari.oau.edu.ng`, Matric: `CSC/2021/042`)

### ⚠️ Security Requirements for Seeding

- **Development Only:** The seed script is strictly intended for local development. It unconditionally halts if executed in a production environment (`NODE_ENV=production`).
- **No Hardcoded Passwords:** The script **does not contain fallback passwords**. You must define your own secure development passwords in `.env.local` before running the seeder.
- **Never Commit Passwords:** Real or development passwords must **never** be committed to Git. `.env.local` is ignored by Git.

### Required Environment Variables

Add the following to your local `.env.local` file:

```bash
# Required seed passwords (min. 8 characters each)
SEED_ADMIN_PASSWORD=your_secure_dev_admin_password
SEED_ORGANIZER_PASSWORD=your_secure_dev_organizer_password
SEED_STUDENT_PASSWORD=your_secure_dev_student_password

# Optional customization
SEED_ADMIN_EMAIL=admin@notari.oau.edu.ng
SEED_ORGANIZER_EMAIL=organizer@notari.oau.edu.ng
SEED_STUDENT_EMAIL=student@notari.oau.edu.ng
SEED_STUDENT_MATRIC=CSC/2021/042
```

> **Tip:** You can generate strong random passwords in your terminal using:
> ```bash
> openssl rand -base64 16
> ```

### Running the Seeder

Once `MONGODB_URI` and the 3 required seed passwords are set in `.env.local`:

```bash
npm run db:seed
```

The script will hash all passwords using `bcryptjs` (12 rounds) and safely insert or update the accounts without duplication. Actual passwords are never printed to terminal logs.

---

## Live Database Integration Testing (`npm run test:e2e`)

To execute real end-to-end integration tests verifying live registration, normalization, uniqueness constraints, bcrypt encryption, query masking, and credentials authorization against MongoDB:

```bash
npm run test:e2e
```

The integration test runner creates isolated development test accounts (`test_e2e_*`) and cleans them up automatically upon completion. Real accounts are never affected.
