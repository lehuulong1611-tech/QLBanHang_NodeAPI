// server.js
const express = require('express');
const cors = require('cors'); 
const app = express();

// Gọi file cấu hình db sang để kích hoạt kết nối ban đầu
const { dbConfig, sql } = require('./db');

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Kết nối Database ngay khi bật Server
sql.connect(dbConfig)
    .then(() => console.log("🔥 Đã thông mạch kết nối về SQL Server công ty!"))
    .catch(err => console.error("❌ Lỗi kết nối DB:", err.message));

// 🚀 Đăng ký các Controller (Sửa lại đúng tên thư mục 'control' của bạn)
app.use('/api/ToaDoKhachHang', require('./controller/ToaDoKhachHangController'));
app.use('/api/NhanVien', require('./controller/NhanVienController')); 
app.use('/api/KhachHang', require('./controller/KhachHangController'));
app.use('/api/DonHang', require('./controller/DonHangController'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 API Node.js đang chạy tại cổng ${PORT}`);
});
