const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();

// Bật CORS để tất cả các ứng dụng khác (Web/Mobile) gọi vào được
app.use(cors());
app.use(express.json());

// ⚙️ Cấu hình kết nối SQL Server về máy công ty bạn (Cổng 48261)
const dbConfig = {
    user: 'sa',
    password: 'vts',
    server: 'hieusachcuonghuong.cameraddns.net',
    port: 48261,
    database: 'CHBANH2026',
    options: {
        encrypt: false, // 🚨 Tắt mã hóa SSL để không bao giờ bị lỗi Handshake
        trustServerCertificate: true,
        connectTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Hàm kết nối SQL Server dùng chung
async function getDbConnection() {
    try {
        return await sql.connect(dbConfig);
    } catch (err) {
        console.error('Lỗi kết nối SQL Server:', err.message);
        throw err;
    }
}

// =========================================================================
// 🌟 1. GET: api/ToaDoKhachHang/:maKH (Lấy tọa độ theo Mã Khách Hàng)
// =========================================================================
app.get('/api/ToaDoKhachHang/:maKH', async (req, res) => {
    const { maKH } = req.params;
    if (!maKH) {
        return res.status(400).send("Thiếu thông tin mã khách hàng.");
    }

    try {
        let pool = await getDbConnection();
        let result = await pool.request()
            .input('MaKhachHang', sql.VarChar, maKH)
            .query('SELECT MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat FROM ToaDoKhachHang WHERE MaKhachHang = @MaKhachHang');

        if (result.recordset.length === 0) {
            return res.status(404).send("Chưa có dữ liệu vị trí cho khách hàng này.");
        }

        const row = result.recordset[0];
        // Trả về đúng định dạng chữ lạc đà (camelCase) giống C# lúc nãy xuất ra
        res.json({
            maKhachHang: row.MaKhachHang,
            viDo: row.ViDo ? parseFloat(row.ViDo) : 0,
            kinhDo: row.KinhDo ? parseFloat(row.KinhDo) : 0,
            ngayCapNhat: row.NgayCapNhat ? new Date(row.NgayCapNhat).toISOString().split('.')[0] : null,
            nguoiCapNhat: row.NguoiCapNhat || ""
        });
    } catch (err) {
        res.status(500).json({ error: `Lỗi hệ thống khi lấy tọa độ khách hàng: ${err.message}` });
    }
});

// =========================================================================
// 🌟 1.5 GET: api/ToaDoKhachHang (Lấy TOÀN BỘ danh sách tọa độ)
// =========================================================================
app.get('/api/ToaDoKhachHang', async (req, res) => {
    try {
        let pool = await getDbConnection();
        let result = await pool.request()
            .query('SELECT MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat FROM ToaDoKhachHang');

        const listToaDo = result.recordset.map(row => ({
            maKhachHang: row.MaKhachHang,
            viDo: row.ViDo ? parseFloat(row.ViDo) : 0,
            kinhDo: row.KinhDo ? parseFloat(row.KinhDo) : 0,
            ngayCapNhat: row.NgayCapNhat ? new Date(row.NgayCapNhat).toISOString().split('.')[0] : null,
            nguoiCapNhat: row.NguoiCapNhat || ""
        }));

        res.json(listToaDo);
    } catch (err) {
        res.status(500).json({ error: `Lỗi hệ thống khi tải toàn bộ tọa độ: ${err.message}` });
    }
});

// =========================================================================
// 🌟 3. GET: api/KhachHang (Lấy toàn bộ danh sách Khách Hàng thỏa mãn điều kiện)
// =========================================================================
app.get('/api/KhachHang', async (req, res) => {
    try {
        let pool = await getDbConnection();
        
        // 1. Thực hiện truy vấn với điều kiện LaKhachHang = 1 (tương đương true trong SQL Server)
        let result = await pool.request()
            .query('SELECT Ma, Ten, DienThoai, DiaChi FROM DmKhachHangs WHERE LaKhachHang = 1');

        // 2. Chuyển thành dữ liệu phẳng với đúng định dạng chữ lạc đà (camelCase) như C# xuất ra
        const ketQuaPhang = result.recordset.map(kh => ({
            maKhachHang: kh.Ma || "",
            tenKhachHang: kh.Ten || "Không rõ tên",
            dienThoai: kh.DienThoai || "",
            diaChi: kh.DiaChi || ""
        }));

        // 3. Trả về mảng trần luôn, không đóng gói phân trang đúng theo logic cũ của bạn
        res.json(ketQuaPhang);
    } catch (err) {
        // Trả về lỗi định dạng chuỗi y hệt hệ thống cũ để Client dễ bắt lỗi
        res.status(500).json({ error: `Lỗi hệ thống: ${err.message}` });
    }
});






// =========================================================================
// 🌟 2. POST: api/ToaDoKhachHang (Lưu hoặc Cập nhật tọa độ - UPSERT)
// =========================================================================
app.post('/api/ToaDoKhachHang', async (req, res) => {
    const dto = req.body;
    if (!dto || !dto.MaKhachHang) {
        return res.status(400).send("Dữ liệu tọa độ không hợp lệ.");
    }

    try {
        let pool = await getDbConnection();

        // 1. Kiểm tra khách hàng đã có tọa độ chưa
        let checkResult = await pool.request()
            .input('MaKhachHang', sql.VarChar, dto.MaKhachHang)
            .query('SELECT COUNT(1) as count FROM ToaDoKhachHang WHERE MaKhachHang = @MaKhachHang');
        
        const exists = checkResult.recordset[0].count > 0;

        // 2. Chọn lệnh UPDATE hoặc INSERT
        let sqlExecute = "";
        if (exists) {
            sqlExecute = `
                UPDATE ToaDoKhachHang 
                SET ViDo = @ViDo, 
                    KinhDo = @KinhDo, 
                    NgayCapNhat = GETDATE(), 
                    NguoiCapNhat = @NguoiCapNhat 
                WHERE MaKhachHang = @MaKhachHang`;
        } else {
            sqlExecute = `
                INSERT INTO ToaDoKhachHang (MaKhachHang, ViDo, KinhDo, NgayCapNhat, NguoiCapNhat) 
                VALUES (@MaKhachHang, @ViDo, @KinhDo, GETDATE(), @NguoiCapNhat)`;
        }

        // 3. Thực thi
        await pool.request()
            .input('MaKhachHang', sql.VarChar, dto.MaKhachHang)
            .input('ViDo', sql.Decimal(18, 10), dto.ViDo)
            .input('KinhDo', sql.Decimal(18, 10), dto.KinhDo)
            .input('NguoiCapNhat', sql.VarChar, dto.NguoiCapNhat || null)
            .query(sqlExecute);

        res.json({ success: true, message: "Cập nhật tọa độ khách hàng thành công!" });
    } catch (err) {
        res.status(500).json({ error: `Lỗi hệ thống khi lưu tọa độ: ${err.message}` });
    }
});

// Cấu hình cổng chạy cho Render (Render thường dùng cổng 10000 hoặc tự cấp qua biến môi trường)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 API Node.js mới đã sẵn sàng chạy tại cổng ${PORT}`);
});
