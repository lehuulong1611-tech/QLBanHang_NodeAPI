const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

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

        // ==========================================
        // 1. XỬ LÝ NHÓM HÀNG AN TOÀN
        // ==========================================
        let danhSachNhom = [];

        if (nhomHangs && nhomHangs.trim() !== "") {
            danhSachNhom = nhomHangs
                .split(',')
                .map(x => x.replace(/\[|\]/g, '').trim()) // bỏ [] nếu có
                .filter(x => x !== "");
        }

        // ==========================================
        // 2. QUERY SQL
        // ==========================================
        let query = `
            SELECT  Ma,
    Ten,
    DVT,
    Ma1,
    Giasi,
    GiaLe,
    SLg1Lo AS slg1Lo,
    NhomHang,
    SoLuongConLai
            FROM Tonkho
            WHERE SoLuongConLai > 0
        `;

        if (danhSachNhom.length > 0) {
            const chuoiInSql = danhSachNhom
                .map(x => `'${x.replace(/'/g, "''")}'`)
                .join(',');

            query += `
                AND REPLACE(REPLACE(LTRIM(RTRIM(NhomHang)), '[',''), ']','')
                IN (${chuoiInSql})
            `;
        }

        const result = await pool.request().query(query);
       
        tatCaSanPham = result.recordset;

        // ==========================================
        // 3. PHÂN TRANG
        // ==========================================
        const totalCount = tatCaSanPham.length;

        const startIndex = (page - 1) * pageSize;
        const danhSachPhanTrang = tatCaSanPham.slice(
            startIndex,
            startIndex + pageSize
        );

        // ==========================================
        // 4. FORMAT DATA
        // ==========================================
       const ketQuaPhang = danhSachPhanTrang.map(tk => {
    
    return {
        ma: tk.Ma,
        ten: tk.Ten,
        dvt: tk.DVT,
        slg1Lo: tk.slg1Lo,
        giasi: tk.Giasi ?? 0,
        soLuongConLai: tk.SoLuongConLai ?? 0,
        nhomHang: tk.NhomHang ?? ""
    };
});

        // ==========================================
        // 5. RETURN
        // ==========================================
        return res.json({
            TotalRecords: totalCount,
            CurrentPage: page,
            PageSize: pageSize,
            Data: ketQuaPhang
        });

    } catch (err) {
        console.error("Lỗi SanPham API:", err);
        return res.status(500).send(
            `Lỗi hệ thống lấy dữ liệu sản phẩm: ${err.message}`
        );
    }
});

module.exports = router;
