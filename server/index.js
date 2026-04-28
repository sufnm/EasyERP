import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sql from 'mssql';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// Database configurations
const dbServer = process.env.DB_SERVER;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running correctly.' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

async function testConnections() {
   // Try MSSQL First due to 'sa' user probability
   try {
     console.log('Attempting MSSQL Connection...');
     await sql.connect({
        user: dbUser,
        password: dbPassword,
        server: dbServer,
        database: dbName,
        options: { encrypt: false, trustServerCertificate: true }
     });
     console.log('Successfully connected to MSSQL Database!');
   } catch (err) {
     console.log('MSSQL Connection failed:', err.message);
     console.log('Attempting MySQL Connection...');
     try {
       const connection = await mysql.createConnection({
         host: dbServer,
         user: dbUser,
         password: dbPassword,
         database: dbName
       });
       console.log('Successfully connected to MySQL Database!');
       await connection.end();
     } catch (mysqlErr) {
       console.log('MySQL Connection failed too:', mysqlErr.message);
     }
   }
}

testConnections();
