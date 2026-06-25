const express = require('express');
const router = express.Router();
// ĐƯỜNG DẪN: Lấy đúng hàm getDbConnection và thư viện sql từ file server.js gốc của bạn
// Nếu file này nằm sâu hơn trong thư mục (vd: controllers/), hãy đảm bảo đường dẫn '../server' là chính xác
const { getDbConnection, sql } = require('../server'); 

// =========================================================================
// 🌟 1. GET: api/NhanVien?page=1&pageSize=50 (LẤY DANH SÁCH NHÂN VIÊN PHÂN TRANG)
// =========================================================================
router.get('/', async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let pageSize = parseInt(req.query.pageSize) || 50;

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 50;

        // Kết nối cơ sở dữ liệu thông qua hàm dùng chung trong server.js
        const pool = await getDbConnection();
        
        // Tạo một request duy nhất để tái sử dụng, tránh lỗi Concurrent Request trên Render
        const request = pool.request();

        // A. Tính tổng số lượng nhân viên để làm phân trang
        const countResult = await request.query('SELECT COUNT(*) AS Total FROM Dm_Nhanvien');
        const totalCount = countResult.recordset[0]?.Total || 0;

        // B. Thực hiện truy vấn phân trang bằng SQL thuần (Dùng chung bộ request ở trên)
        const offset = (page - 1) * pageSize;
        const listResult = await request
            .input('Offset', sql.Int, offset)
            .input('PageSize', sql.Int, pageSize)
            .query(`
                SELECT Ma, Ten, DienThoai, Chucvu 
                FROM DM_NhanVien
                ORDER BY Ma ASC
                OFFSET @Offset ROWS
                FETCH NEXT @PageSize ROWS ONLY
            `);

        // C. Map lại dữ liệu theo đúng định dạng "ketQuaPhang" của C# cũ
        const ketQuaPhang = listResult.recordset.map(nv => ({
            maNhanVien: nv.Ma,
            tenNhanVien: nv.Ten || "Không rõ tên",
            dienThoai: nv.DienThoai || "",
            gioiTinh: nv.Chucvu || "" // Giữ nguyên map Chucvu -> gioiTinh theo logic C# của bạn
        }));

        // D. Trả về đúng cấu trúc Object phân trang cũ
        return res.json({
            TotalRecords: totalCount,
            CurrentPage: page,
            PageSize: pageSize,
            Data: ketQuaPhang
        });

    } catch (err) {
        return res.status(500).send(`Lỗi hệ thống nhân viên: ${err.message}`);
    }
});

// =========================================================================
// 🌟 2. GET: api/NhanVien/get-nhom-hang/:maNhanVien (DANH SÁCH NHÓM HÀNG THEO QUYỀN)
// =========================================================================
router.get('/get-nhom-hang/:maNhanVien', async (req, res) => {
    const { maNhanVien } = req.params;

    try {
        // Kết nối thông qua hàm dùng chung
        const pool = await getDbConnection();

        // Quét bảng phân quyền để lấy ra danh sách mã nhóm hàng (Manhom) của nhân viên này
        const result = await pool.request()
            .input('MaNhanVien', sql.VarChar, maNhanVien)
            .query('SELECT Manhom FROM PhanQuyenNhanVien WHERE Ma = @MaNhanVien');

        // Trích xuất mảng string phẳng (ví dụ: ["NHOM01", "NHOM02"]) giống .Select(pq => pq.Manhom) trong C#
        const dsNhomHang = result.recordset.map(row => row.Manhom);

        return res.json(dsNhomHang);

    } catch (err) {
        return res.status(500).send(`Lỗi hệ thống khi lấy quyền nhóm hàng: ${err.message}`);
    }
});

module.exports = router;
