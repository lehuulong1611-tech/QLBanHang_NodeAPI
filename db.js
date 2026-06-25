// db.js
const sql = require('mssql');

const dbConfig = {
    user: 'sa',
    password: 'vts',
    server: 'hieusachcuonghuong.cameraddns.net',
    port: 48261,
    database: 'CHBANH2026',
    options: {
        encrypt: false, 
        trustServerCertificate: true,
        connectTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function getDbConnection() {
    try {
        return await sql.connect(dbConfig);
    } catch (err) {
        console.error('Lỗi kết nối SQL Server:', err.message);
        throw err;
    }
}

// Xuất ra cho cả server.js và các controller cùng dùng
module.exports = { getDbConnection, sql, dbConfig };
