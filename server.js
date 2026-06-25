const express = require('express');
const cors = require('cors'); // 1. Đảm bảo đã có dòng này
const sql = require('mssql');

const app = express();

// 2. Cấu hình CORS mở toang cửa cho Firebase gọi vào
app.use(cors({
    origin: '*', // Cho phép tất cả các tên miền (bao gồm cả Firebase) gọi vào
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ... Các đoạn code dbConfig và app.use('/api/KhachHang'...) giữ nguyên phía dưới

// ⚙️ Cấu hình kết nối SQL Server về máy công ty bạn (Cổng 48261)
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

// Hàm kết nối SQL Server dùng chung
async function getDbConnection() {
    try {
        return await sql.connect(dbConfig);
    } catch (err) {
        console.error('Lỗi kết nối SQL Server:', err.message);
        throw err;
    }
}
// Kết nối Database ngay khi bật Server
sql.connect(dbConfig)
    .then(() => console.log("🔥 Đã thông mạch kết nối về SQL Server công ty!"))
    .catch(err => console.error("❌ Lỗi kết nối DB:", err.message));

// 🚀 Đăng ký các Controller (Giống như MapControllers trong C#)
app.use('/api/ToaDoKhachHang', require('./controllers/ToaDoKhachHangController'));
app.use('/api/KhachHang', require('./controllers/KhachHangController'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 API Node.js đang chạy tại cổng ${PORT}`);
});
