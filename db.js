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
        console.error('❌ Lỗi DB:', err.message);

        // ❗ Không throw err gốc nữa
        const safeError = new Error('DỮ LIỆU TẠM THỜI ĐÓNG! THỜI GIAN LÀM VIỆC TỪ 6h15 đến 22h00');
        safeError.status = 503;
        throw safeError;
    }
}

// Xuất ra cho cả server.js và các controller cùng dùng
module.exports = { getDbConnection, sql, dbConfig };
