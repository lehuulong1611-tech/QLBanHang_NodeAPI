const express = require('express');
const router = express.Router();

// 🟢 ĐƯỜNG DẪN CHÍNH XÁC: Lấy đúng hàm kết nối dùng chung từ file db.js ở ngoài
const { getDbConnection, sql } = require('../db');

// =========================================================================
// 🌟 1. GET: api/ToaDoKhachHang/:maKH
// =========================================================================
router.get('/:maKH', async (req, res) => {
    const { maKH } = req.params;
    if (!maKH) return res.status(400).send("Thiếu thông tin mã khách hàng.");
    try {
        // Thay đổi: Lấy pool an toàn từ db.js
        const pool = await getDbConnection(); 
        
        let result = await pool.request()
            .input('MaKhachHang', sql.VarChar, maKH)
            .query('SELECT MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat FROM ToaDoKhachHang WHERE MaKhachHang = @MaKhachHang');

        if (result.recordset.length === 0) return res.status(404).send("Chưa có dữ liệu vị trí cho khách hàng này.");

        const row = result.recordset[0];
        res.json({
            maKhachHang: row.MaKhachHang,
            viDo: row.ViDo ? parseFloat(row.ViDo) : 0,
            kinhDo: row.KinhDo ? parseFloat(row.KinhDo) : 0,
            ngayCapNhat: row.NgayCapNhat ? new Date(row.NgayCapNhat).toISOString().split('.')[0] : null,
            nguoiCapNhat: row.NguoiCapNhat || ""
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// 🌟 1.5 GET: api/ToaDoKhachHang
// =========================================================================
router.get('/', async (req, res) => {
    try {
        // Thay đổi: Lấy pool an toàn từ db.js
        const pool = await getDbConnection(); 
        
        let result = await pool.request().query('SELECT MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat FROM ToaDoKhachHang');
        const listToaDo = result.recordset.map(row => ({
            maKhachHang: row.MaKhachHang,
            viDo: row.ViDo ? parseFloat(row.ViDo) : 0,
            kinhDo: row.KinhDo ? parseFloat(row.KinhDo) : 0,
            ngayCapNhat: row.NgayCapNhat ? new Date(row.NgayCapNhat).toISOString().split('.')[0] : null,
            nguoiCapNhat: row.NguoiCapNhat || ""
        }));
        res.json(listToaDo);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// 🌟 2. POST: api/ToaDoKhachHang
// =========================================================================
router.post('/', async (req, res) => {
    const dto = req.body;
    if (!dto || !dto.maKhachHang) return res.status(400).send("Dữ liệu tọa độ không hợp lệ.");
    
    try {
        // Thay đổi: Lấy pool an toàn từ db.js
        const pool = await getDbConnection(); 
        
        const { maKhachHang, viDo, kinhDo, nguoiCapNhat } = req.body;

        // Tạo một đối tượng request duy nhất cho chuỗi xử lý CHECK -> INSERT/UPDATE
        const request = pool.request();

        let checkResult = await request
            .input('MaKhachHang', sql.VarChar, maKhachHang)
            .query('SELECT COUNT(1) as count FROM ToaDoKhachHang WHERE MaKhachHang = @MaKhachHang');
        
        const exists = checkResult.recordset[0].count > 0;
        let sqlExecute = exists 
            ? `UPDATE ToaDoKhachHang SET ViDo=@ViDo, KinhDo=@KinhDo, NgayCapNhat=GETDATE(), NguoiCapNhat=@NguoiCapNhat WHERE MaKhachHang=@MaKhachHang`
            : `INSERT INTO ToaDoKhachHang (MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat) VALUES (@MaKhachHang, @ViDo, @KinhDo, GETDATE(), @NguoiCapNhat)`;

        // Tái sử dụng request và bổ sung thêm input đầu vào để thực thi câu lệnh tiếp theo
        await request
            .input('ViDo', sql.Decimal(18, 10), viDo)
            .input('KinhDo', sql.Decimal(18, 10), kinhDo)
            .input('NguoiCapNhat', sql.VarChar, nguoiCapNhat || null)
            .query(sqlExecute);

        res.json({ success: true, message: "Cập nhật tọa độ khách hàng thành công!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
