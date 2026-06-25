const express = require('express');
const cors = require('cors'); 
const sql = require('mssql');
const app = express();

// 1. Cấu hình CORS mở toang cửa cho Firebase gọi vào
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. ⚙️ Cấu hình kết nối SQL Server về máy công ty bạn (Cổng 48261)
const dbConfig = {
    user: 'sa',
    password: 'vts',
    server: 'hieusachcuonghuong.cameraddns.net',
    port: 48261,
    database: 'CHBANH2026',
    options: {
        encrypt: false, // 🚨 Tắt mã hóa SSL để không bao giờ bị lỗi Handshake
        trustServerCertificate: true,
        connectTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Hàm kết nối SQL Server dùng chung (để các controller có thể require và dùng)
async function getDbConnection() {
    try {
        return await sql.connect(dbConfig);
    } catch (err) {
        console.error('Lỗi kết nối SQL Server:', err.message);
        throw err;
    }
}

// Xuất hàm này ra để các file Controller khác có thể sử dụng lại
module.exports = { getDbConnection, sql };

// Kết nối Database ngay khi bật Server
sql.connect(dbConfig)
    .then(() => console.log("🔥 Đã thông mạch kết nối về SQL Server công ty!"))
    .catch(err => console.error("❌ Lỗi kết nối DB:", err.message));

// 3. 🚀 Đăng ký các Controller (Đảm bảo tên thư mục Controllers viết hoa/thường phải đúng với GitHub)
app.use('/api/ToaDoKhachHang', require('./controllers/ToaDoKhachHangController'));
app.use('/api/KhachHang', require('./controllers/KhachHangController'));
app.use('/api/DonHang', require('./controllers/DonHangController'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 API Node.js đang chạy tại cổng ${PORT}`);
});
