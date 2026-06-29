const express = require('express');
const router = express.Router();

// 🟢 ĐƯỜNG DẪN CHÍNH XÁC: Lấy đúng hàm kết nối dùng chung từ file db.js ở ngoài
const { getDbConnection, sql } = require('../db');

// =========================================================================
// 🌟 3. GET: api/KhachHang
// =========================================================================
router.get('/', async (req, res) => {
    try {
        // Thay đổi: Lấy pool kết nối an toàn từ db.js để tránh xung đột trên Render
        const pool = await getDbConnection();
        
        let result = await pool.request()
            .query('SELECT Ma, Ten, DienThoai, DiaChi FROM DM_KhachHang WHERE LaKhachHang = 1 and NhomKH!=0015');

        const ketQuaPhang = result.recordset.map(kh => ({
            maKhachHang: kh.Ma || "",
            tenKhachHang: kh.Ten || "Không rõ tên",
            dienThoai: kh.DienThoai || "",
            diaChi: kh.DiaChi || ""
        }));

        res.json(ketQuaPhang);
    } catch (err) {
        res.status(500).json({ error: `Lỗi hệ thống: ${err.message}` });
    }
});

module.exports = router;
