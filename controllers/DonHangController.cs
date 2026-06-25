using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using QLBanHangAPI.Models; // Giữ nguyên theo namespace của bạn
using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Storage;
using System.Collections.Generic;

namespace QLBanHangAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DonHangController : ControllerBase
    {
        private readonly CHBANHDbContext _context;

        public DonHangController(CHBANHDbContext context)
        {
            _context = context;
        }

        // =========================================================================
        // 🌟 1. API LẤY CHI TIẾT SẢN PHẨM TỪ BẢNG web_ChiTietDonHang (Dùng SQL Thuần)
        // =========================================================================
        [HttpGet("GetChiTiet/{maDonHang}")]
        public async Task<IActionResult> GetChiTietDonHang(string maDonHang)
        {
            if (string.IsNullOrEmpty(maDonHang))
            {
                return BadRequest("Thiếu thông tin mã đơn hàng.");
            }

            try
            {
                string sqlQuery = "SELECT * FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang";
                var connection = _context.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                var danhSachChiTiet = new List<object>();

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = sqlQuery;
                    var param = command.CreateParameter();
                    param.ParameterName = "@MaDonHang";
                    param.Value = maDonHang;
                    command.Parameters.Add(param);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            danhSachChiTiet.Add(new
                            {
                                maDonHang = reader["MaDonHang"]?.ToString(),
                                maHangNCC = reader["MaHangNCC"]?.ToString(),
                                tenSanPham = reader["TenSanPham"]?.ToString(),
                                quyCach = reader["QuyCach"] != DBNull.Value ? Convert.ToInt32(reader["QuyCach"]) : 1,
                                donViLe = reader["DonViLe"]?.ToString() ?? "Gói",
                                dvtSelected = reader["DvtSelected"]?.ToString() ?? "thung",
                                loaiHang = reader["LoaiHang"]?.ToString() ?? "hang_ban",
                                soLuong = reader["SoLuong"] != DBNull.Value ? Convert.ToInt32(reader["SoLuong"]) : 0,
                                donGiaGoc = reader["DonGiaGoc"] != DBNull.Value ? Convert.ToDecimal(reader["DonGiaGoc"]) : 0,
                                tienHangGoc = reader["TienHangGoc"] != DBNull.Value ? Convert.ToDecimal(reader["TienHangGoc"]) : 0,
                                chietKhauPhanTram = reader["ChietKhauPhanTram"] != DBNull.Value ? Convert.ToDecimal(reader["ChietKhauPhanTram"]) : 0,
                                tienChietKhau = reader["TienChietKhau"] != DBNull.Value ? Convert.ToDecimal(reader["TienChietKhau"]) : 0,
                                giaSauChietKhau = reader["GiaSauChietKhau"] != DBNull.Value ? Convert.ToDecimal(reader["GiaSauChietKhau"]) : 0,
                                thanhTienCuoiCung = reader["ThanhTienCuoiCung"] != DBNull.Value ? Convert.ToDecimal(reader["ThanhTienCuoiCung"]) : 0
                            });
                        }
                    }
                }
                return Ok(danhSachChiTiet);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống khi lấy chi tiết đơn hàng: {ex.Message}");
            }
        }

        // =========================================================================
        // 🌟 2. API CẬP NHẬT ĐƠN HÀNG CHỜ DUYỆT (100% SQL Thuần ADO.NET)
        // =========================================================================
        [HttpPut("CapNhatDonChoDuyet/{maDonHang}")]
        public async Task<IActionResult> CapNhatDonChoDuyet(string maDonHang, [FromBody] DonHangCapNhatDto dto)
        {
            if (dto == null || maDonHang != dto.MaDonHang)
            {
                return BadRequest("Dữ liệu đơn hàng không hợp lệ.");
            }

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            // Đọc trạng thái đơn hàng hiện tại dưới DB bằng SQL thuần
            string trangThaiHienTai = null;
            using (var checkCmd = connection.CreateCommand())
            {
                checkCmd.CommandText = "SELECT TrangThai FROM web_DonHang WHERE MaDonHang = @MaDonHang";
                var p = checkCmd.CreateParameter();
                p.ParameterName = "@MaDonHang";
                p.Value = maDonHang;
                checkCmd.Parameters.Add(p);

                var statusObj = await checkCmd.ExecuteScalarAsync();
                trangThaiHienTai = statusObj?.ToString();
            }

            if (string.IsNullOrEmpty(trangThaiHienTai))
            {
                return NotFound("Không tìm thấy đơn hàng này trên hệ thống.");
            }

            if (trangThaiHienTai != "Chờ duyệt")
            {
                return BadRequest("Đơn hàng đã được duyệt hoặc bị hủy, không thể sửa đổi nữa!");
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // A. UPDATE bảng web_DonHang
                    string updateDonHangSql = @"
                        UPDATE web_DonHang 
                        SET MaKhachHang = @MaKhachHang, 
                            TenKhachHang = @TenKhachHang, 
                            SoDienThoaiKH = @SoDienThoaiKH,
                            DiaChiKH = @DiaChiKH,
                            TongTienThanhToan = @TongTienThanhToan, 
                            GhiChuDonHang = @GhiChuDonHang,
                            NgayGiaoHang = @NgayGiaoHang
                        WHERE MaDonHang = @MaDonHang";

                    await _context.Database.ExecuteSqlRawAsync(updateDonHangSql,
                        new SqlParameter("@MaKhachHang", dto.MaKhachHang ?? ""),
                        new SqlParameter("@TenKhachHang", dto.TenKhachHang ?? ""),
                        new SqlParameter("@SoDienThoaiKH", dto.SoDienThoaiKH ?? (object)DBNull.Value),
                        new SqlParameter("@DiaChiKH", dto.DiaChiKH ?? (object)DBNull.Value),
                        new SqlParameter("@TongTienThanhToan", dto.TongTienThanhToan),
                        new SqlParameter("@GhiChuDonHang", dto.GhiChuDonHang ?? (object)DBNull.Value),
                        new SqlParameter("@NgayGiaoHang", dto.NgayGiaoHang ?? (object)DBNull.Value),
                        new SqlParameter("@MaDonHang", maDonHang)
                    );

                    // B. DELETE chi tiết đơn hàng cũ
                    string deleteChiTietSql = "DELETE FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang";
                    await _context.Database.ExecuteSqlRawAsync(deleteChiTietSql, new SqlParameter("@MaDonHang", maDonHang));

                    // C. INSERT lại danh sách chi tiết mới
                    if (dto.DanhSachSanPham != null && dto.DanhSachSanPham.Any())
                    {
                        string insertChiTietSql = @"
                            INSERT INTO web_ChiTietDonHang (MaDonHang, MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang, SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau, GiaSauChietKhau, ThanhTienCuoiCung)
                            VALUES (@MaDonHang, @MaHangNCC, @TenSanPham, @QuyCach, @DonViLe, @DvtSelected, @LoaiHang, @SoLuong, @DonGiaGoc, @TienHangGoc, @ChietKhauPhanTram, @TienChietKhau, @GiaSauChietKhau, @ThanhTienCuoiCung)";

                        foreach (var item in dto.DanhSachSanPham)
                        {
                            await _context.Database.ExecuteSqlRawAsync(insertChiTietSql,
                                new SqlParameter("@MaDonHang", maDonHang),
                                new SqlParameter("@MaHangNCC", item.MaHangNCC ?? ""),
                                new SqlParameter("@TenSanPham", item.TenSanPham ?? ""),
                                new SqlParameter("@QuyCach", item.QuyCach),
                                new SqlParameter("@DonViLe", item.DonViLe ?? "Gói"),
                                new SqlParameter("@DvtSelected", item.DvtSelected ?? "thung"),
                                new SqlParameter("@LoaiHang", item.LoaiHang ?? "hang_ban"),
                                new SqlParameter("@SoLuong", item.SoLuong),
                                new SqlParameter("@DonGiaGoc", item.DonGiaGoc),
                                new SqlParameter("@TienHangGoc", item.TienHangGoc),
                                new SqlParameter("@ChietKhauPhanTram", item.ChietKhauPhanTram),
                                new SqlParameter("@TienChietKhau", item.TienChietKhau),
                                new SqlParameter("@GiaSauChietKhau", item.GiaSauChietKhau),
                                new SqlParameter("@ThanhTienCuoiCung", item.ThanhTienCuoiCung)
                            );
                        }
                    }

                    await transaction.CommitAsync();
                    return Ok(new { success = true, message = "Cập nhật đơn hàng thành công!" });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"Lỗi hệ thống khi cập nhật đơn hàng: {ex.Message}");
                }
            }
        }

        // =========================================================================
        // 🌟 3. GET: api/DonHang/TrongNgay?maNV=NV001 (LẤY ĐƠN + CHI TIẾT SẢN PHẨM)
        // =========================================================================
        [HttpGet("TrongNgay")]
        public async Task<IActionResult> GetDonHangTrongNgay([FromQuery] string maNV)
        {
            if (string.IsNullOrEmpty(maNV))
            {
                return BadRequest("Thiếu thông tin mã nhân viên.");
            }

            try
            {
                DateTime homNay = DateTime.Today;

                // 1. Lấy danh sách các đơn hàng trong ngày của nhân viên trước
                string sqlDonHang = @"
                    SELECT 
                        MaDonHang, NgayTaoDon, MaNhanVien, TenNhanVien,
                        MaKhachHang, TenKhachHang, SoDienThoaiKH, DiaChiKH,
                        GhiChuDonHang, NgayGiaoHang, TongTienThanhToan, TrangThai
                    FROM web_DonHang
                    WHERE NgayTaoDon >= @HomNay AND MaNhanVien = @MaNhanVien
                    ORDER BY NgayTaoDon DESC";

                var connection = _context.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                var listDonHang = new List<dynamic>();

                using (var cmdDH = connection.CreateCommand())
                {
                    cmdDH.CommandText = sqlDonHang;

                    var p1 = cmdDH.CreateParameter();
                    p1.ParameterName = "@HomNay";
                    p1.Value = homNay;
                    cmdDH.Parameters.Add(p1);

                    var p2 = cmdDH.CreateParameter();
                    p2.ParameterName = "@MaNhanVien";
                    p2.Value = maNV;
                    cmdDH.Parameters.Add(p2);

                    using (var readerDH = await cmdDH.ExecuteReaderAsync())
                    {
                        while (await readerDH.ReadAsync())
                        {
                            listDonHang.Add(new
                            {
                                maDonHang = readerDH["MaDonHang"]?.ToString(),
                                ngayTaoDon = Convert.ToDateTime(readerDH["NgayTaoDon"]).ToString("yyyy-MM-ddTHH:mm:ss"),
                                maNhanVien = readerDH["MaNhanVien"]?.ToString(),
                                tenNhanVien = readerDH["TenNhanVien"]?.ToString(),
                                maKhachHang = readerDH["MaKhachHang"]?.ToString(),
                                tenKhachHang = readerDH["TenKhachHang"]?.ToString(),
                                soDienThoaiKH = readerDH["SoDienThoaiKH"]?.ToString(),
                                diaChiKH = readerDH["DiaChiKH"]?.ToString(),
                                ghiChuDonHang = readerDH["GhiChuDonHang"]?.ToString(),
                                ngayGiaoHang = readerDH["NgayGiaoHang"] != DBNull.Value ? Convert.ToDateTime(readerDH["NgayGiaoHang"]).ToString("yyyy-MM-dd") : null,
                                tongTienThanhToan = Convert.ToDecimal(readerDH["TongTienThanhToan"]),
                                trangThai = readerDH["TrangThai"]?.ToString()
                            });
                        }
                    }
                }

                // 2. Đi tuần tự qua từng đơn hàng vừa lấy được để bốc bảng chi tiết web_ChiTietDonHang gắn vào
                string sqlChiTiet = @"
                    SELECT 
                        MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang,
                        SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau,
                        GiaSauChietKhau, ThanhTienCuoiCung
                    FROM web_ChiTietDonHang
                    WHERE MaDonHang = @MaDonHang";

                var finalResult = new List<object>();

                foreach (var dh in listDonHang)
                {
                    var listChiTiet = new List<object>();

                    using (var cmdCT = connection.CreateCommand())
                    {
                        cmdCT.CommandText = sqlChiTiet;

                        var pMaDon = cmdCT.CreateParameter();
                        pMaDon.ParameterName = "@MaDonHang";
                        pMaDon.Value = dh.maDonHang;
                        cmdCT.Parameters.Add(pMaDon);

                        using (var readerCT = await cmdCT.ExecuteReaderAsync())
                        {
                            while (await readerCT.ReadAsync())
                            {
                                listChiTiet.Add(new
                                {
                                    maHangNCC = readerCT["MaHangNCC"]?.ToString(),
                                    tenSanPham = readerCT["TenSanPham"]?.ToString(),
                                    quyCach = Convert.ToInt32(readerCT["QuyCach"]),
                                    donViLe = readerCT["DonViLe"]?.ToString(),
                                    dvtSelected = readerCT["DvtSelected"]?.ToString(),
                                    loaiHang = readerCT["LoaiHang"]?.ToString(),
                                    soLuong = Convert.ToInt32(readerCT["SoLuong"]),
                                    donGiaGoc = Convert.ToDecimal(readerCT["DonGiaGoc"]),
                                    tienHangGoc = Convert.ToDecimal(readerCT["TienHangGoc"]),
                                    chietKhauPhanTram = Convert.ToDecimal(readerCT["ChietKhauPhanTram"]),
                                    tienChietKhau = Convert.ToDecimal(readerCT["TienChietKhau"]),
                                    giaSauChietKhau = Convert.ToDecimal(readerCT["GiaSauChietKhau"]),
                                    thanhTienCuoiCung = Convert.ToDecimal(readerCT["ThanhTienCuoiCung"])
                                });
                            }
                        }
                    }

                    // Gộp mảng chi tiết sản phẩm vào object đơn hàng
                    finalResult.Add(new
                    {
                        dh.maDonHang,
                        dh.ngayTaoDon,
                        dh.maNhanVien,
                        dh.tenNhanVien,
                        dh.maKhachHang,
                        dh.tenKhachHang,
                        dh.soDienThoaiKH,
                        dh.diaChiKH,
                        dh.ghiChuDonHang,
                        dh.ngayGiaoHang,
                        dh.tongTienThanhToan,
                        dh.trangThai,
                        danhSachSanPham = listChiTiet
                    });
                }

                return Ok(finalResult);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống khi lấy đơn hàng trong ngày: {ex.Message}");
            }
        }

        // =========================================================================
        // 🌟 4. GET: api/DonHang/ThongKeDashboard?maNV=NV001
        // =========================================================================
        [HttpGet("ThongKeDashboard")]
        public async Task<IActionResult> GetThongKeDashboard([FromQuery] string maNV)
        {
            if (string.IsNullOrEmpty(maNV))
            {
                return BadRequest("Thiếu thông tin mã nhân viên.");
            }

            try
            {
                DateTime homNay = DateTime.Today;
                string sqlQuery = @"
                    SELECT 
                        ISNULL(SUM(CASE WHEN TrangThai = N'Đã duyệt' OR TrangThai = N'Chờ duyệt' THEN TongTienThanhToan ELSE 0 END), 0) AS DoanhSoGiaoDich,
                        ISNULL(SUM(CASE WHEN TrangThai = N'Chờ duyệt' THEN 1 ELSE 0 END), 0) AS SoDonChoDuyet,
                        ISNULL(SUM(CASE WHEN TrangThai = N'Đã duyệt' THEN 1 ELSE 0 END), 0) AS SoDonDaDuyet,
                        COUNT(DISTINCT MaKhachHang) AS SoKhachMua,
                        (
                            SELECT COUNT(DISTINCT c.MaHangNCC) 
                            FROM web_ChiTietDonHang c
                            INNER JOIN web_DonHang d ON c.MaDonHang = d.MaDonHang
                            WHERE d.NgayTaoDon >= @HomNay AND d.MaNhanVien = @MaNhanVien AND d.TrangThai <> N'Hủy đơn' AND d.TrangThai <> N'Hủy'
                        ) AS SoSKU
                    FROM web_DonHang
                    WHERE NgayTaoDon >= @HomNay AND MaNhanVien = @MaNhanVien";

                var connection = _context.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                var result = new { doanhSoHomNay = 0m, choDuyet = 0, daDuyet = 0, khachMua = 0, sku = 0 };

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = sqlQuery;

                    var paramHomNay = command.CreateParameter();
                    paramHomNay.ParameterName = "@HomNay";
                    paramHomNay.Value = homNay;
                    command.Parameters.Add(paramHomNay);

                    var paramMaNV = command.CreateParameter();
                    paramMaNV.ParameterName = "@MaNhanVien";
                    paramMaNV.Value = maNV;
                    command.Parameters.Add(paramMaNV);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            result = new
                            {
                                doanhSoHomNay = Convert.ToDecimal(reader["DoanhSoGiaoDich"]),
                                choDuyet = Convert.ToInt32(reader["SoDonChoDuyet"]),
                                daDuyet = Convert.ToInt32(reader["SoDonDaDuyet"]),
                                khachMua = Convert.ToInt32(reader["SoKhachMua"]),
                                sku = Convert.ToInt32(reader["SoSKU"])
                            };
                        }
                    }
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống khi lấy số liệu Dashboard: {ex.Message}");
            }
        }

        // =========================================================================
        // 🌟 5. POST: api/DonHang (Hàm Thêm đơn hàng gốc - Sinh mã tăng dần tự động)
        // =========================================================================
        [HttpPost]
        public async Task<IActionResult> TaoDonHang([FromBody] DonHangInsertModel model)
        {
            if (model == null || model.DanhSachSanPham == null || model.DanhSachSanPham.Count == 0)
            {
                return BadRequest("Dữ liệu đơn hàng hoặc danh sách sản phẩm không hợp lệ.");
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    string prefix = $"WB{DateTime.Now:yyMM}";
                    string maDonHangChinhThuc = "";

                    var connection = _context.Database.GetDbConnection();
                    if (connection.State != ConnectionState.Open)
                        await connection.OpenAsync();

                    using (var command = connection.CreateCommand())
                    {
                        command.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                        command.CommandText = "SELECT MAX(MaDonHang) FROM web_DonHang WHERE MaDonHang LIKE @Prefix";

                        var param = command.CreateParameter();
                        param.ParameterName = "@Prefix";
                        param.Value = prefix + "%";
                        command.Parameters.Add(param);

                        var maxMaDonHangObj = await command.ExecuteScalarAsync();
                        string maxMaDonHang = maxMaDonHangObj != DBNull.Value ? maxMaDonHangObj?.ToString() : null;

                        if (string.IsNullOrEmpty(maxMaDonHang))
                        {
                            maDonHangChinhThuc = prefix + "00001";
                        }
                        else
                        {
                            int lastNumber = int.Parse(maxMaDonHang.Substring(6));
                            int nextNumber = lastNumber + 1;
                            maDonHangChinhThuc = prefix + nextNumber.ToString("D5");
                        }
                    }

                    string insertDonHangSql = @"
                        INSERT INTO web_DonHang (MaDonHang, MaDonHangTam, NgayTaoDon, MaNhanVien, TenNhanVien, MaKhachHang, TenKhachHang, SoDienThoaiKH, DiaChiKH, GhiChuDonHang, NgayGiaoHang, TongTienThanhToan, TrangThai)
                        VALUES (@MaDonHang, @MaDonHangTam, @NgayTaoDon, @MaNhanVien, @TenNhanVien, @MaKhachHang, @TenKhachHang, @SoDienThoaiKH, @DiaChiKH, @GhiChuDonHang, @NgayGiaoHang, @TongTienThanhToan, @TrangThai)";

                    await _context.Database.ExecuteSqlRawAsync(insertDonHangSql,
                        new SqlParameter("@MaDonHang", maDonHangChinhThuc),
                        new SqlParameter("@MaDonHangTam", model.MaDonHangTam ?? (object)DBNull.Value),
                        new SqlParameter("@NgayTaoDon", model.NgayTaoDon),
                        new SqlParameter("@MaNhanVien", model.MaNhanVien ?? "CHƯA_RÕ"),
                        new SqlParameter("@TenNhanVien", model.TenNhanVien ?? "Chưa rõ tên"),
                        new SqlParameter("@MaKhachHang", model.MaKhachHang ?? ""),
                        new SqlParameter("@TenKhachHang", model.TenKhachHang ?? ""),
                        new SqlParameter("@SoDienThoaiKH", model.SoDienThoaiKH ?? (object)DBNull.Value),
                        new SqlParameter("@DiaChiKH", model.DiaChiKH ?? (object)DBNull.Value),
                        new SqlParameter("@GhiChuDonHang", model.GhiChuDonHang ?? (object)DBNull.Value),
                        new SqlParameter("@NgayGiaoHang", model.NgayGiaoHang ?? (object)DBNull.Value),
                        new SqlParameter("@TongTienThanhToan", model.TongTienThanhToan),
                        new SqlParameter("@TrangThai", model.TrangThai ?? "Chờ duyệt")
                    );

                    string insertChiTietSql = @"
                        INSERT INTO web_ChiTietDonHang (MaDonHang, MaHangNCC, TenSanPham, QuyCach, DonViLe, DvtSelected, LoaiHang, SoLuong, DonGiaGoc, TienHangGoc, ChietKhauPhanTram, TienChietKhau, GiaSauChietKhau, ThanhTienCuoiCung)
                        VALUES (@MaDonHang, @MaHangNCC, @TenSanPham, @QuyCach, @DonViLe, @DvtSelected, @LoaiHang, @SoLuong, @DonGiaGoc, @TienHangGoc, @ChietKhauPhanTram, @TienChietKhau, @GiaSauChietKhau, @ThanhTienCuoiCung)";

                    foreach (var item in model.DanhSachSanPham)
                    {
                        await _context.Database.ExecuteSqlRawAsync(insertChiTietSql,
                            new SqlParameter("@MaDonHang", maDonHangChinhThuc),
                            new SqlParameter("@MaHangNCC", item.MaHangNCC ?? ""),
                            new SqlParameter("@TenSanPham", item.TenSanPham ?? ""),
                            new SqlParameter("@QuyCach", item.QuyCach),
                            new SqlParameter("@DonViLe", item.DonViLe ?? "Gói"),
                            new SqlParameter("@DvtSelected", item.DvtSelected ?? "thung"),
                            new SqlParameter("@LoaiHang", item.LoaiHang ?? "hang_ban"),
                            new SqlParameter("@SoLuong", item.SoLuong),
                            new SqlParameter("@DonGiaGoc", item.DonGiaGoc),
                            new SqlParameter("@TienHangGoc", item.TienHangGoc),
                            new SqlParameter("@ChietKhauPhanTram", item.ChietKhauPhanTram),
                            new SqlParameter("@TienChietKhau", item.TienChietKhau),
                            new SqlParameter("@GiaSauChietKhau", item.GiaSauChietKhau),
                            new SqlParameter("@ThanhTienCuoiCung", item.ThanhTienCuoiCung)
                        );
                    }

                    await transaction.CommitAsync();
                    return Ok(new { success = true, maDonHangChinhThuc = maDonHangChinhThuc });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"Lỗi hệ thống khi lưu đơn hàng: {ex.Message}");
                }
            }
        }

        // =========================================================================
        // 🌟 6. DELETE: api/DonHang/{maDonHang} (API XÓA ĐƠN CHỜ DUYỆT - SQL THUẦN)
        // =========================================================================
        [HttpDelete("{maDonHang}")]
        public async Task<IActionResult> XoaDonHangChoDuyet(string maDonHang)
        {
            if (string.IsNullOrEmpty(maDonHang))
            {
                return BadRequest("Thiếu thông tin mã đơn hàng cần xóa.");
            }

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            // 1. Kiểm tra trạng thái đơn hàng trước khi cho phép xóa
            string trangThaiHienTai = null;
            using (var checkCmd = connection.CreateCommand())
            {
                checkCmd.CommandText = "SELECT TrangThai FROM web_DonHang WHERE MaDonHang = @MaDonHang";
                var p = checkCmd.CreateParameter();
                p.ParameterName = "@MaDonHang";
                p.Value = maDonHang;
                checkCmd.Parameters.Add(p);

                var statusObj = await checkCmd.ExecuteScalarAsync();
                trangThaiHienTai = statusObj?.ToString();
            }

            if (string.IsNullOrEmpty(trangThaiHienTai))
            {
                return NotFound($"Không tìm thấy đơn hàng {maDonHang} trên hệ thống.");
            }

            // Chỉ cho phép xóa đơn ở trạng thái Chờ Duyệt
            if (trangThaiHienTai != "Chờ duyệt")
            {
                return BadRequest("Đơn hàng này đã được xử lý (Đã duyệt hoặc Hủy), không thể xóa khỏi hệ thống!");
            }

            // 2. Tiến hành xóa dữ liệu trong Transaction
            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // Bước A: Xóa toàn bộ sản phẩm thuộc đơn hàng trong bảng chi tiết trước (Tránh lỗi khóa ngoại)
                    string deleteChiTietSql = "DELETE FROM web_ChiTietDonHang WHERE MaDonHang = @MaDonHang";
                    await _context.Database.ExecuteSqlRawAsync(deleteChiTietSql, new SqlParameter("@MaDonHang", maDonHang));

                    // Bước B: Xóa đơn hàng trong bảng tổng web_DonHang
                    string deleteDonHangSql = "DELETE FROM web_DonHang WHERE MaDonHang = @MaDonHang";
                    int rowsAffected = await _context.Database.ExecuteSqlRawAsync(deleteDonHangSql, new SqlParameter("@MaDonHang", maDonHang));

                    await transaction.CommitAsync();

                    if (rowsAffected > 0)
                    {
                        return Ok(new { success = true, message = $"Đã xóa thành công đơn hàng {maDonHang}." });
                    }
                    else
                    {
                        return BadRequest("Xóa đơn hàng thất bại, vui lòng thử lại.");
                    }
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"Lỗi hệ thống khi xóa đơn hàng: {ex.Message}");
                }
            }
        }

        // =========================================================================
        // 📦 CÁC CẤU TRÚC DTO (DATA TRANSFER OBJECT) VÀ MODELS NHẬN DỮ LIỆU
        // =========================================================================
        
        // 1. DTO cho chức năng Cập Nhật Đơn Hàng (PUT)
        public class DonHangCapNhatDto
        {
            public string MaDonHang { get; set; }
            public string MaKhachHang { get; set; }
            public string TenKhachHang { get; set; }
            public string SoDienThoaiKH { get; set; }
            public string DiaChiKH { get; set; }
            public decimal TongTienThanhToan { get; set; }
            public string GhiChuDonHang { get; set; }
            public DateTime? NgayGiaoHang { get; set; }
            public List<ChiTietSanPhamCapNhatDto> DanhSachSanPham { get; set; }
        }

        public class ChiTietSanPhamCapNhatDto
        {
            public string MaHangNCC { get; set; }
            public string TenSanPham { get; set; }
            public int QuyCach { get; set; }
            public string DonViLe { get; set; }
            public string DvtSelected { get; set; }
            public string LoaiHang { get; set; }
            public int SoLuong { get; set; }
            public decimal DonGiaGoc { get; set; }
            public decimal TienHangGoc { get; set; }
            public decimal ChietKhauPhanTram { get; set; }
            public decimal TienChietKhau { get; set; }
            public decimal GiaSauChietKhau { get; set; }
            public decimal ThanhTienCuoiCung { get; set; }
        }

        // 2. Model cho chức năng Tạo Đơn Hàng Mới (POST)
        public class DonHangInsertModel
        {
            public string MaDonHangTam { get; set; }
            public DateTime NgayTaoDon { get; set; }
            public string MaNhanVien { get; set; }
            public string TenNhanVien { get; set; }
            public string MaKhachHang { get; set; }
            public string TenKhachHang { get; set; }
            public string SoDienThoaiKH { get; set; }
            public string DiaChiKH { get; set; }
            public string GhiChuDonHang { get; set; }
            public DateTime? NgayGiaoHang { get; set; }
            public decimal TongTienThanhToan { get; set; }
            public string TrangThai { get; set; }
            public List<ChiTietSanPhamInsertModel> DanhSachSanPham { get; set; }
        }

        public class ChiTietSanPhamInsertModel
        {
            public string MaHangNCC { get; set; }
            public string TenSanPham { get; set; }
            public int QuyCach { get; set; }
            public string DonViLe { get; set; }
            public string DvtSelected { get; set; }
            public string LoaiHang { get; set; }
            public int SoLuong { get; set; }
            public decimal DonGiaGoc { get; set; }
            public decimal TienHangGoc { get; set; }
            public decimal ChietKhauPhanTram { get; set; }
            public decimal TienChietKhau { get; set; }
            public decimal GiaSauChietKhau { get; set; }
            public decimal ThanhTienCuoiCung { get; set; }
        }
    }
}
