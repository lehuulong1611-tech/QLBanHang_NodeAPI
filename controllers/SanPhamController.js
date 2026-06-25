const express = require('express');
const router = express.Router();
const { getDbConnection, sql } = require('../db');

// ==========================================
// GET: api/SanPham?page=1&pageSize=50&nhomHangs=0001,0002
// ==========================================
router.get('/', async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let pageSize = parseInt(req.query.pageSize) || 50;
        let nhomHangs = req.query.nhomHangs || "";

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 50;

        const pool = await getDbConnection();

        let tatCaSanPham = [];

        // ==============================
        // 1. LẤY DỮ LIỆU TỪ VIEW TONKHO
        // ==============================
        if (nhomHangs && nhomHangs.trim() !== "") {

            const danhSachNhom = nhomHangs
                .split(',')
                .map(x => x.trim())
                .filter(x => x !== "");

            const chuoiInSql = danhSachNhom.map(x => `'${x.replace(/'/g, "''")}'`).join(',');

            const query = `
                SELECT *
                FROM Tonkho
                WHERE SoLuongConLai > 0
                  AND NhomHang IN (${chuoiInSql})
            `;

            const result = await pool.request().query(query);
            tatCaSanPham = result.recordset;

        } else {

            const result = await pool.request().query(`
                SELECT *
                FROM Tonkho
                WHERE SoLuongConLai > 0
            `);

            tatCaSanPham = result.recordset;
        }

        // ==============================
        // 2. TỔNG RECORD
        // ==============================
        const totalCount = tatCaSanPham.length;

        // ==============================
        // 3. PHÂN TRANG (RAM - giống C# của bạn)
        // ==============================
        const startIndex = (page - 1) * pageSize;
        const danhSachPhanTrang = tatCaSanPham.slice(startIndex, startIndex + pageSize);

        // ==============================
        // 4. FORMAT DATA (GIỐNG C#)
        // ==============================
        const ketQuaPhang = danhSachPhanTrang.map(tk => ({
            ma: tk.Ma,
            ten: tk.Ten,
            dvt: tk.Dvt,
            slg1Lo: tk.Slg1Lo ?? 1.0,
            giasi: tk.Giasi ?? 0,
            soLuongConLai: tk.SoLuongConLai ?? 0,
            nhomHang: tk.NhomHang ?? ""
        }));

        // ==============================
        // 5. RETURN GIỐNG CHUẨN PROJECT
        // ==============================
        return res.json({
            TotalRecords: totalCount,
            CurrentPage: page,
            PageSize: pageSize,
            Data: ketQuaPhang
        });

    } catch (err) {
        return res.status(500).send(
            `Lỗi hệ thống lấy dữ liệu sản phẩm: ${err.message}`
        );
    }
});

module.exports = router;
