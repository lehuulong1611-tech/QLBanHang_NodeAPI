const express = require('express');
const router = express.Router();
const sql = require('mssql');

// 🌟 3. GET: api/KhachHang
router.get('/', async (req, res) => {
    try {
        let pool = await sql.connect();
        let result = await pool.request()
            .query('SELECT Ma, Ten, DienThoai, DiaChi FROM DmKhachHangs WHERE LaKhachHang = 1');

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
