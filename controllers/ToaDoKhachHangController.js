const express = require('express');
const router = express.Router();
const sql = require('mssql');

// 🌟 1. GET: api/ToaDoKhachHang/:maKH
router.get('/:maKH', async (req, res) => {
    const { maKH } = req.params;
    if (!maKH) return res.status(400).send("Thiếu thông tin mã khách hàng.");
    try {
        let pool = await sql.connect(); // Tự dùng connection pool có sẵn
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

// 🌟 1.5 GET: api/ToaDoKhachHang
router.get('/', async (req, res) => {
    try {
        let pool = await sql.connect();
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

// 🌟 2. POST: api/ToaDoKhachHang
// 🌟 Sửa lại đoạn POST trong controllers/ToaDoKhachHangController.js
router.post('/', async (req, res) => {
    const dto = req.body;
    if (!dto || !dto.maKhachHang) return res.status(400).send("Dữ liệu tọa độ không hợp lệ.");
    
    try {
        let pool = await sql.connect();
        
        // Đón đúng chữ viết thường từ Payload JavaScript gửi sang
        const { maKhachHang, viDo, kinhDo, nguoiCapNhat } = req.body;

        let checkResult = await pool.request()
            .input('MaKhachHang', sql.VarChar, maKhachHang)
            .query('SELECT COUNT(1) as count FROM ToaDoKhachHang WHERE MaKhachHang = @MaKhachHang');
        
        const exists = checkResult.recordset[0].count > 0;
        let sqlExecute = exists 
            ? `UPDATE ToaDoKhachHang SET ViDo=@ViDo, KinhDo=@KinhDo, NgayCapNhat=GETDATE(), NguoiCapNhat=@NguoiCapNhat WHERE MaKhachHang=@MaKhachHang`
            : `INSERT INTO ToaDoKhachHang (MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat) VALUES (@MaKhachHang, @ViDo, @KinhDo, GETDATE(), @NguoiCapNhat)`;

        await pool.request()
            .input('MaKhachHang', sql.VarChar, maKhachHang)
            .input('ViDo', sql.Decimal(18, 10), viDo)
            .input('KinhDo', sql.Decimal(18, 10), kinhDo)
            .input('NguoiCapNhat', sql.VarChar, nguoiCapNhat || null)
            .query(sqlExecute);

        res.json({ success: true, message: "Cập nhật tọa độ khách hàng thành công!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router; // Xuất router này ra ngoài
