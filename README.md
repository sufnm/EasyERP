# EasyERP

A web-based ERP system built with React (Vite) and Node.js (Express) with MSSQL.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **SQL Server**: Access to a Microsoft SQL Server instance

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd EasyERP
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and configure your database settings. You can use `.env.example` as a template:

```bash
cp .env.example .env
```

Edit the `.env` file with your SQL Server details:
- `DB_SERVER`: Your database server IP or domain
- `DB_USER`: Your database username
- `DB_PASSWORD`: Your database password
- `DB_NAME`: `Eazysoftdb` (or your specific database name)
- `PORT`: `3000` (Backend API port)

### 4. Running the Application

You need to run both the backend and the frontend.

#### Start the Backend Server
```bash
npm run start:server
```
The server will run on `http://localhost:3000`.

#### Start the Frontend (Vite)
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Configuration

If you need to change the API endpoint for the frontend, you can set the `VITE_API_URL` environment variable or modify `src/config.js`.

```javascript
// src/config.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```
