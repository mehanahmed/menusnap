import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

const pool =
  globalThis.__mysqlPool ||
  mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'menubldr',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 30000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mysqlPool = pool;
}

export default pool;
