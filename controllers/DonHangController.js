const express = require('express');
const router = express.Router();
// Require hàm kết nối từ server.js
const sql = require('mssql');

// =========================================================================
// 🌟 1. API LẤY CHI TIẾT SẢN PHẨM TỪ BẢNG web_ChiTietDonHang
// =========================================================================
router.get('/GetChiTiet/:maDonHang', async (req, res) => {
    const { maDonHang } = req.params;
    if (!maDonHang) return res.status(400).send("Thiếu thông tin mã đơn hàng.");

    try {
        await getDbConnection();
        const result = await sql.query`SELECT * FROM web_ChiTietDonHang WHERE MaDonHang = ${maDonHang}`;
        
        const danhSachChiTiet = result.recordset.map(row => ({
            maDonHang: row.MaDonHang,
            maHangNCC: row.MaHangNCC,
            tenSanPham: row.TenSanPham,
            quyCach: row.QuyCach || 1,
            donViLe: row.DonViLe || "Gói",
            dvtSelected: row.DvtSelected || "thung",
            loaiHang: row.LoaiHang || "hang_ban",
            soLuong: row.SoLuong || 0,
            donGiaGoc: row.DonGiaGoc || 0,
            tienHangGoc: row.TienHangGoc || 0,
            chietKhauPhanTram: row.ChietKhauPhanTram || 0,
            tienChietKhau: row.TienChietKhau || 0,
            giaSauChietKhau: row.GiaSauChietKhau || 0,
            thanhTienCuoiCung: row.ThanhTienCuoiCung || 0
        }));

        return res.ok ? res.ok(danhSachChiTiet) : res.json(danhSachChiTiet);
    } catch (err) {
        return res.status(500).send(`Lỗi hệ thống khi lấy chi tiết đơn hàng: ${err.message}`);
    }
});

// =========================================================================
// 🌟 2. API CẬP NHẬT ĐƠN HÀNG CHỜ DUYỆT
// =========================================================================
router.put('/CapNhatDonChoDuyet/:maDonHang', async (req, res) => {
    const { maDonHang } = req.params;
    const dto = req.body;

    if (!dto || maDonHang !== dto.maDonHang) {
        return res.status(400).send("Dữ liệu đơn hàng không hợp lệ.");
    }

    
    let pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Kiểm tra trạng thái hiện tại
        const checkRequest = new sql.Request(transaction);
        const checkResult = await checkRequest
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query('SELECT TrangThai FROM web_DonHang WHERE MaDonHang = @MaDonHang');

        const trangThaiHienTai = checkResult.recordset[0]?.TrangThai;

        if (!trangThaiHienTai) {
            await transaction.rollback();
            return res.status(404).send("Không tìm thấy đơn hàng này trên hệ thống.");
        }
        if (trangThaiHienTai !== "Chờ duyệt") {
            await transaction.rollback();
            return res.status(400).send("Đơn hàng đã được duyệt hoặc bị hủy, không thể sửa đổi nữa!");
        }

        // A. UPDATE bảng web_DonHang
        const updateRequest = new sql.Request(transaction);
        await updateRequest
            .input('MaKhachHang', sql.NVarChar, dto.maKhachHang || "")
            .input('TenKhachHang', sql.NVarChar, dto.tenKhachHang || "")
            .input('SoDienThoaiKH', sql.VarChar, dto.soDienThoaiKH || null)
            .input('DiaChiKH', sql.NVarChar, dto.diaChiKH || null)
            .input('TongTienThanhToan', sql.Decimal(18, 2), dto.tongTienThanhToan)
            .input('GhiChuDonHang', sql.NVarChar, dto.ghiChuDonHang || null)
            .input('NgayGiaoHang', sql.DateTime, dto.ngayGiaoHang || null)
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query(`
                UPDATE web_DonHang 
                SET MaKhachHang = @MaKhachHang, TenKhachHang = @TenKhachHang, 
                    SoDienThoaiKH = @SoDienThoaiKH, DiaChiKH = @DiaChiKH,
                    TongTienThanhToan = @TongTienThanhToan, GhiChuDonHang = @GhiChuDonHang, NgayGiaoHang = @NgayGiaoHang
                WHERE MaDonHang = @MaDonHang`);

        // B. DELETE chi tiết đơn hàng cũ
        const deleteRequest = new sql.Request(transaction);
        await deleteRequest
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query('DELETE FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang');

        // C. INSERT lại danh sách chi tiết mới
        if (dto.danhSachSanPham && dto.danhSachSanPham.length > 0) {
            for (const item of dto.danhSachSanPham) {
                const insertRequest = new sql.Request(transaction);
                await insertRequest
                    .input('MaDonHang', sql.VarChar, maDonHang)
                    .input('MaHangNCC', sql.VarChar, item.maHangNCC || "")
                    .input('TenSanPham', sql.NVarChar, item.tenSanPham || "")
                    .input('QuyCach', sql.Int, item.quyCach)
                    .input('DonViLe', sql.NVarChar, item.donViLe || "Gói")
                    .input('DvtSelected', sql.NVarChar, item.dvtSelected || "thung")
                    .input('LoaiHang', sql.NVarChar, item.loaiHang || "hang_ban")
                    .input('SoLuong', sql.Int, item.soLuong)
                    .input('DonGiaGoc', sql.Decimal(18, 2), item.donGiaGoc)
                    .input('TienHangGoc', sql.Decimal(18, 2), item.tienHangGoc)
                    .input('ChietKhauPhanTram', sql.Decimal(5, 2), item.chietKhauPhanTram)
                    .input('TienChietKhau', sql.Decimal(18, 2), item.tienChietKhau)
                    .input('GiaSauChietKhau', sql.Decimal(18, 2), item.giaSauChietKhau)
                    .input('ThanhTienCuoiCung', sql.Decimal(18, 2), item.thanhTienCuoiCung)
                    .query(`
                        INSERT INTO web_ChiTietDonHang (MaDonHang, MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang, SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau, GiaSauChietKhau, ThanhTienCuoiCung)
                        VALUES (@MaDonHang, @MaHangNCC, @TenSanPham, @QuyCach, @DonViLe, @DvtSelected, @LoaiHang, @SoLuong, @DonGiaGoc, @TienHangGoc, @ChietKhauPhanTram, @TienChietKhau, @GiaSauChietKhau, @ThanhTienCuoiCung)`);
            }
        }

        await transaction.commit();
        return res.json({ success = true, message = "Cập nhật đơn hàng thành công!" });
    } catch (err) {
        await transaction.rollback();
        return res.status(500).send(`Lỗi hệ thống khi cập nhật đơn hàng: ${err.message}`);
    }
});

// =========================================================================
// 🌟 3. GET: api/DonHang/TrongNgay?maNV=NV001
// =========================================================================
router.get('/TrongNgay', async (req, res) => {
    const { maNV } = req.query;
    if (!maNV) return res.status(400).send("Thiếu thông tin mã nhân viên.");

    try {
       
        let pool = await sql.connect();
        const homNay = new Date();
        homNay.setHours(0,0,0,0);

        // 1. Lấy danh sách đơn hàng
        const donHangResult = await pool.request()
            .input('HomNay', sql.DateTime, homNay)
            .input('MaNhanVien', sql.VarChar, maNV)
            .query(`
                SELECT MaDonHang, NgayTaoDon, MaNhanVien, TenNhanVien, MaKhachHang, TenKhachHang, SoDienThoaiKH, DiaChiKH, GhiChuDonHang, NgayGiaoHang, TongTienThanhToan, TrangThai
                FROM web_DonHang WHERE NgayTaoDon >= @HomNay AND MaNhanVien = @MaNhanVien ORDER BY NgayTaoDon DESC`);

        const finalResult = [];

        // 2. Đi lấy chi tiết từng đơn
        for (const dh of donHangResult.recordset) {
            const chiTietResult = await pool.request()
                .input('MaDonHang', sql.VarChar, dh.MaDonHang)
                .query(`
                    SELECT MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang, SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau, GiaSauChietKhau, ThanhTienCuoiCung
                    FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang`);

            finalResult.push({
                maDonHang: dh.MaDonHang,
                ngayTaoDon: dh.NgayTaoDon,
                maNhanVien: dh.MaNhanVien,
                tenNhanVien: dh.TenNhanVien,
                maKhachHang: dh.MaKhachHang,
                tenKhachHang: dh.TenKhachHang,
                soDienThoaiKH: dh.SoDienThoaiKH,
                diaChiKH: dh.DiaChiKH,
                ghiChuDonHang: dh.GhiChuDonHang,
                ngayGiaoHang: dh.NgayGiaoHang,
                tongTienThanhToan: dh.TongTienThanhToan,
                trangThai: dh.TrangThai,
                danhSachSanPham: chiTietResult.recordset.map(ct => ({
                    maHangNCC: ct.MaHangNCC,
                    tenSanPham: ct.TenSanPham,
                    quyCach: ct.QuyCach,
                    donViLe: ct.DonViLe,
                    dvtSelected: ct.DvtSelected,
                    loaiHang: ct.LoaiHang,
                    soLuong: ct.SoLuong,
                    donGiaGoc: ct.DonGiaGoc,
                    tienHangGoc: ct.TienHangGoc,
                    chietKhauPhanTram: ct.ChietKhauPhanTram,
                    tienChietKhau: ct.TienChietKhau,
                    giaSauChietKhau: ct.GiaSauChietKhau,
                    thanhTienCuoiCung: ct.ThanhTienCuoiCung
                }))
            });
        }

        return res.json(finalResult);
    } catch (err) {
        return res.status(500).send(`Lỗi hệ thống khi lấy đơn hàng trong ngày: ${err.message}`);
    }
});

// =========================================================================
// 🌟 4. GET: api/DonHang/ThongKeDashboard?maNV=NV001
// =========================================================================
router.get('/ThongKeDashboard', async (req, res) => {
    const { maNV } = req.query;
    if (!maNV) return res.status(400).send("Thiếu thông tin mã nhân viên.");

    try {
        let pool = await sql.connect();
        const homNay = new Date();
        homNay.setHours(0,0,0,0);

        const result = await pool.request()
            .input('HomNay', sql.DateTime, homNay)
            .input('MaNhanVien', sql.VarChar, maNV)
            .query(`
                SELECT 
                    ISNULL(SUM(CASE WHEN TrangThai = N'Đã duyệt' OR TrangThai = N'Chờ duyệt' THEN TongTienThanhToan ELSE 0 END), 0) AS DoanhSoGiaoDich,
                    ISNULL(SUM(CASE WHEN TrangThai = N'Chờ duyệt' THEN 1 ELSE 0 END), 0) AS SoDonChoDuyet,
                    ISNULL(SUM(CASE WHEN TrangThai = N'Đã duyệt' THEN 1 ELSE 0 END), 0) AS SoDonDaDuyet,
                    COUNT(DISTINCT MaKhachHang) AS SoKhachMua,
                    (SELECT COUNT(DISTINCT c.MaHangNCC) FROM web_ChiTietDonHang c INNER JOIN web_DonHang d ON c.MaDonHang = d.MaDonHang WHERE d.NgayTaoDon >= @HomNay AND d.MaNhanVien = @MaNhanVien AND d.TrangThai <> N'Hủy đơn' AND d.TrangThai <> N'Hủy') AS SoSKU
                FROM web_DonHang WHERE NgayTaoDon >= @HomNay AND MaNhanVien = @MaNhanVien`);

        const data = result.recordset[0];
        return res.json({
            doanhSoHomNay: data.DoanhSoGiaoDich,
            choDuyet: data.SoDonChoDuyet,
            daDuyet: data.SoDonDaDuyet,
            khachMua: data.SoKhachMua,
            sku: data.SoSKU
        });
    } catch (err) {
        return res.status(500).send(`Lỗi hệ thống khi lấy số liệu Dashboard: ${err.message}`);
    }
});

// =========================================================================
// 🌟 5. POST: api/DonHang (Thêm đơn hàng - Sinh mã tự động)
// =========================================================================
router.post('/', async (req, res) => {
    const model = req.body;
    if (!model || !model.danhSachSanPham || model.danhSachSanPham.length === 0) {
        return res.status(400).send("Dữ liệu đơn hàng hoặc danh sách sản phẩm không hợp lệ.");
    }

    let pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Tạo tiền tố mã đơn hàng (Ví dụ: WB2606)
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `WB${yy}${mm}`;

        // Tìm mã lớn nhất để tăng dần
        const maxRequest = new sql.Request(transaction);
        const maxResult = await maxRequest
            .input('Prefix', sql.VarChar, prefix + '%')
            .query('SELECT MAX(MaDonHang) AS MaxMa FROM web_DonHang WHERE MaDonHang LIKE @Prefix');

        const maxMaDonHang = maxResult.recordset[0]?.MaxMa;
        let maDonHangChinhThuc = "";

        if (!maxMaDonHang) {
            maDonHangChinhThuc = prefix + "00001";
        } else {
            const lastNumber = parseInt(maxMaDonHang.substring(6));
            maDonHangChinhThuc = prefix + String(lastNumber + 1).padStart(5, '0');
        }

        // Chèn bảng tổng đơn hàng
        const insertDHRequest = new sql.Request(transaction);
        await insertDHRequest
            .input('MaDonHang', sql.VarChar, maDonHangChinhThuc)
            .input('MaDonHangTam', sql.VarChar, model.maDonHangTam || null)
            .input('NgayTaoDon', sql.DateTime, model.ngayTaoDon || new Date())
            .input('MaNhanVien', sql.VarChar, model.maNhanVien || "CHƯA_RÕ")
            .input('TenNhanVien', sql.NVarChar, model.tenNhanVien || "Chưa rõ tên")
            .input('MaKhachHang', sql.NVarChar, model.maKhachHang || "")
            .input('TenKhachHang', sql.NVarChar, model.tenKhachHang || "")
            .input('SoDienThoaiKH', sql.VarChar, model.soDienThoaiKH || null)
            .input('DiaChiKH', sql.NVarChar, model.diaChiKH || null)
            .input('GhiChuDonHang', sql.NVarChar, model.ghiChuDonHang || null)
            .input('NgayGiaoHang', sql.DateTime, model.ngayGiaoHang || null)
            .input('TongTienThanhToan', sql.Decimal(18, 2), model.tongTienThanhToan)
            .input('TrangThai', sql.NVarChar, model.trangThai || "Chờ duyệt")
            .query(`
                INSERT INTO web_DonHang (MaDonHang, MaDonHangTam, NgayTaoDon, MaNhanVien, TenNhanVien, MaKhachHang, TenKhachHang, SoDienThoaiKH, DiaChiKH, GhiChuDonHang, NgayGiaoHang, TongTienThanhToan, TrangThai)
                VALUES (@MaDonHang, @MaDonHangTam, @NgayTaoDon, @MaNhanVien, @TenNhanVien, @MaKhachHang, @TenKhachHang, @SoDienThoaiKH, @DiaChiKH, @GhiChuDonHang, @NgayGiaoHang, @TongTienThanhToan, @TrangThai)`);

        // Chèn bảng chi tiết sản phẩm
        for (const item of model.danhSachSanPham) {
            const insertCTRequest = new sql.Request(transaction);
            await insertCTRequest
                .input('MaDonHang', sql.VarChar, maDonHangChinhThuc)
                .input('MaHangNCC', sql.VarChar, item.maHangNCC || "")
                .input('TenSanPham', sql.NVarChar, item.tenSanPham || "")
                .input('QuyCach', sql.Int, item.quyCach)
                .input('DonViLe', sql.NVarChar, item.donViLe || "Gói")
                .input('DvtSelected', sql.NVarChar, item.dvtSelected || "thung")
                .input('LoaiHang', sql.NVarChar, item.loaiHang || "hang_ban")
                .input('SoLuong', sql.Int, item.soLuong)
                .input('DonGiaGoc', sql.Decimal(18, 2), item.donGiaGoc)
                .input('TienHangGoc', sql.Decimal(18, 2), item.tienHangGoc)
                .input('ChietKhauPhanTram', sql.Decimal(5, 2), item.chietKhauPhanTram)
                .input('TienChietKhau', sql.Decimal(18, 2), item.tienChietKhau)
                .input('GiaSauChietKhau', sql.Decimal(18, 2), item.giaSauChietKhau)
                .input('ThanhTienCuoiCung', sql.Decimal(18, 2), item.thanhTienCuoiCung)
                .query(`
                    INSERT INTO web_ChiTietDonHang (MaDonHang, MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang, SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau, GiaSauChietKhau, ThanhTienCuoiCung)
                    VALUES (@MaDonHang, @MaHangNCC, @TenSanPham, @QuyCach, @DonViLe, @DvtSelected, @LoaiHang, @SoLuong, @DonGiaGoc, @TienHangGoc, @ChietKhauPhanTram, @TienChietKhau, @GiaSauChietKhau, @ThanhTienCuoiCung)`);
        }

        await transaction.commit();
        return res.json({ success: true, maDonHangChinhThuc: maDonHangChinhThuc });
    } catch (err) {
        await transaction.rollback();
        return res.status(500).send(`Lỗi hệ thống khi lưu đơn hàng: ${err.message}`);
    }
});

// =========================================================================
// 🌟 6. DELETE: api/DonHang/:maDonHang (Xóa đơn chờ duyệt)
// =========================================================================
router.delete('/:maDonHang', async (req, res) => {
    const { maDonHang } = req.params;
    if (!maDonHang) return res.status(400).send("Thiếu thông tin mã đơn hàng cần xóa.");

    let pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const checkRequest = new sql.Request(transaction);
        const checkResult = await checkRequest
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query('SELECT TrangThai FROM web_DonHang WHERE MaDonHang = @MaDonHang');

        const trangThaiHienTai = checkResult.recordset[0]?.TrangThai;

        if (!trangThaiHienTai) {
            await transaction.rollback();
            return res.status(404).send(`Không tìm thấy đơn hàng ${maDonHang} trên hệ thống.`);
        }
        if (trangThaiHienTai !== "Chờ duyệt") {
            await transaction.rollback();
            return res.status(400).send("Đơn hàng này đã được xử lý (Đã duyệt hoặc Hủy), không thể xóa khỏi hệ thống!");
        }

        // Bước A: Xóa chi tiết đơn hàng
        const deleteCTRequest = new sql.Request(transaction);
        await deleteCTRequest
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query('DELETE FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang');

        // Bước B: Xóa tổng đơn hàng
        const deleteDHRequest = new sql.Request(transaction);
        await deleteDHRequest
            .input('MaDonHang', sql.VarChar, maDonHang)
            .query('DELETE FROM web_DonHang WHERE MaDonHang = @MaDonHang');

        await transaction.commit();
        return res.json({ success: true, message: `Đã xóa thành công đơn hàng ${maDonHang}.` });
    } catch (err) {
        await transaction.rollback();
        return res.status(500).send(`Lỗi hệ thống khi xóa đơn hàng: ${err.message}`);
    }
});

module.exports = router;
