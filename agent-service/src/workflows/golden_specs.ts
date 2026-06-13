import type { LarkBuildPlan } from "../tools/lark.js";

const select = (name: string, options: string[], multiple = false) => ({
  name,
  type: "select" as const,
  options,
  multiple,
});

export function isOtoHopNhat(input: string): boolean {
  const normalized = input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return (
    normalized.includes("hop nhat") ||
    (normalized.includes("xe tai") && normalized.includes("garage")) ||
    (normalized.includes("dan lanh") && normalized.includes("40"))
  );
}

export function otoHopNhatPlan(baseName: string): LarkBuildPlan {
  return {
    baseName,
    tables: [
      {
        logicalKey: "nhan_su",
        name: "01_Nhân sự",
        fields: [
          { name: "Tên nhân sự", type: "text" },
          select("Vai trò", ["Sale", "Trưởng sale", "Admin sales", "Garage", "Kho", "QC", "BOD"]),
          { name: "Nhóm", type: "text" },
          { name: "Điện thoại/Zalo", type: "text" },
          { name: "Đang hoạt động", type: "checkbox" },
        ],
      },
      {
        logicalKey: "khach_hang",
        name: "02_Khách hàng",
        fields: [
          { name: "Tên khách hàng", type: "text" },
          select("Loại khách hàng", ["Doanh nghiệp", "Cá nhân"]),
          { name: "Điện thoại", type: "text" },
          { name: "Tỉnh/Thành", type: "text" },
          select("Phân khúc", ["Tải nhẹ", "Tải trung", "Tải nặng", "Xe chuyên dụng"]),
          { name: "Ghi chú", type: "text" },
        ],
      },
      {
        logicalKey: "xe_ton",
        name: "03_Xe tồn",
        fields: [
          { name: "Mã xe", type: "text" },
          select("Hãng", ["Isuzu", "Hino", "Hyundai", "Thaco", "Dongfeng"]),
          { name: "Model", type: "text" },
          select("Phân khúc", ["Tải nhẹ", "Tải trung", "Tải nặng", "Xe chuyên dụng"]),
          { name: "Tải trọng tấn", type: "number" },
          select("Trạng thái xe", ["Sẵn sàng", "Đã giữ chỗ", "Đã bán", "Đang ở garage"]),
          select("Vị trí", ["Showroom", "Bãi xe", "Garage"]),
          { name: "Ngày sẵn sàng dự kiến", type: "date" },
        ],
      },
      {
        logicalKey: "co_hoi",
        name: "04_Cơ hội bán hàng",
        fields: [
          { name: "Tên cơ hội", type: "text" },
          { name: "Khách hàng", type: "link", linkTable: "khach_hang" },
          { name: "Sale phụ trách", type: "link", linkTable: "nhan_su" },
          select("Nguồn lead", ["Giới thiệu", "Website", "Facebook", "Showroom", "Khác"]),
          select("Phân khúc xe", ["Tải nhẹ", "Tải trung", "Tải nặng", "Xe chuyên dụng"]),
          { name: "Model mong muốn", type: "text" },
          select("Giai đoạn", ["Lead mới", "Đã xác định nhu cầu", "Đã gửi báo giá", "Ý định cao", "Đã chốt đơn", "Thua"]),
          { name: "Giá trị ước tính", type: "number" },
          { name: "Xác suất %", type: "number" },
          { name: "Ngày hành động tiếp theo", type: "date" },
          select("Nhu cầu độ xe", ["Thùng", "Dàn lạnh", "Branding", "Điện/phụ kiện", "Khác"], true),
          { name: "Ngày hứa bàn giao", type: "date" },
          { name: "Lý do kẹt", type: "text" },
        ],
      },
      {
        logicalKey: "don_hang",
        name: "05_Đơn hàng",
        fields: [
          { name: "Mã đơn", type: "text" },
          { name: "Cơ hội", type: "link", linkTable: "co_hoi" },
          { name: "Khách hàng", type: "link", linkTable: "khach_hang" },
          { name: "Mã xe", type: "link", linkTable: "xe_ton" },
          select("Trạng thái cọc", ["Chưa cọc", "Đã cọc", "Hoàn cọc"]),
          select("Trạng thái hồ sơ", ["Thiếu", "Đang xử lý", "Đủ"]),
          select("Trạng thái đơn", ["Đã chốt", "Đã gán xe", "Cần garage", "Đang ở garage", "Sẵn sàng QC", "Đã bàn giao", "Giữ bàn giao"]),
          { name: "Ngày bàn giao dự kiến", type: "date" },
          { name: "Giá trị đơn", type: "number" },
          { name: "Admin phụ trách", type: "link", linkTable: "nhan_su" },
        ],
      },
      {
        logicalKey: "lenh_do_xe",
        name: "06_Lệnh độ xe",
        fields: [
          { name: "Mã lệnh", type: "text" },
          { name: "Mã đơn", type: "link", linkTable: "don_hang" },
          { name: "Mã xe", type: "link", linkTable: "xe_ton" },
          select("Loại độ xe", ["Thùng", "Dàn lạnh", "Branding", "Điện/phụ kiện", "Khác"]),
          { name: "Tóm tắt spec", type: "text" },
          select("Trạng thái garage", ["Chờ tiếp nhận", "Cần rõ spec", "Kiểm vật tư", "Sẵn sàng làm", "Đang làm", "Đang kẹt", "Hoàn tất"]),
          { name: "Phụ trách garage", type: "link", linkTable: "nhan_su" },
          { name: "Ngày bắt đầu dự kiến", type: "date" },
          { name: "Ngày hoàn thành dự kiến", type: "date" },
          { name: "Lý do kẹt", type: "text" },
          select("Ưu tiên", ["Thấp", "Bình thường", "Cao", "Khẩn"]),
        ],
      },
      {
        logicalKey: "vat_tu",
        name: "07_Vật tư garage",
        fields: [
          { name: "Mã vật tư", type: "text" },
          { name: "Tên vật tư", type: "text" },
          select("Nhóm vật tư", ["Thùng", "Dàn lạnh", "Branding", "Điện/phụ kiện"]),
          { name: "Đơn vị", type: "text" },
          { name: "Tồn hiện có", type: "number" },
          { name: "Đã giữ chỗ", type: "number" },
          { name: "Khả dụng", type: "number" },
          { name: "Mức đặt lại", type: "number" },
          { name: "Nhà cung cấp", type: "text" },
          select("Trạng thái tồn", ["Đủ", "Thấp", "Thiếu", "Đã đặt"]),
        ],
      },
      {
        logicalKey: "giu_cho_vat_tu",
        name: "08_Giữ chỗ vật tư",
        fields: [
          { name: "Mã giữ chỗ", type: "text" },
          { name: "Mã lệnh", type: "link", linkTable: "lenh_do_xe" },
          { name: "Mã vật tư", type: "link", linkTable: "vat_tu" },
          { name: "SL cần", type: "number" },
          { name: "SL đã giữ", type: "number" },
          select("Trạng thái giữ chỗ", ["Chưa xử lý", "Đã giữ", "Thiếu", "Đã đặt", "Đã nhận"]),
          { name: "Cần trước ngày", type: "date" },
          { name: "Phụ trách", type: "link", linkTable: "nhan_su" },
          { name: "Ghi chú", type: "text" },
        ],
      },
      {
        logicalKey: "qc_ban_giao",
        name: "09_QC bàn giao",
        fields: [
          { name: "Mã QC", type: "text" },
          { name: "Mã đơn", type: "link", linkTable: "don_hang" },
          { name: "Mã lệnh", type: "link", linkTable: "lenh_do_xe" },
          { name: "Đã kiểm tra xe", type: "checkbox" },
          { name: "Đã kiểm tra phần độ", type: "checkbox" },
          { name: "Đã kiểm tra hồ sơ", type: "checkbox" },
          { name: "Đã kiểm tra thanh toán", type: "checkbox" },
          { name: "Sẵn sàng bàn giao", type: "checkbox" },
          select("Trạng thái QC", ["Chưa kiểm", "Đang kiểm", "Giữ bàn giao", "Đạt", "Đã bàn giao"]),
          { name: "Ngày bàn giao", type: "date" },
          { name: "Phụ trách QC", type: "link", linkTable: "nhan_su" },
          { name: "Ghi chú", type: "text" },
        ],
      },
    ],
    views: [
      { logicalKey: "pipeline_sales", table: "co_hoi", name: "Pipeline sales theo giai đoạn", type: "kanban" },
      { logicalKey: "sale_can_follow", table: "co_hoi", name: "Việc sale cần follow", type: "grid" },
      { logicalKey: "don_can_garage", table: "don_hang", name: "Đơn cần bàn giao garage", type: "grid" },
      { logicalKey: "xe_theo_trang_thai", table: "xe_ton", name: "Tồn xe theo trạng thái", type: "grid" },
      { logicalKey: "queue_garage", table: "lenh_do_xe", name: "Queue garage theo trạng thái", type: "kanban" },
      { logicalKey: "queue_thieu_vat_tu", table: "giu_cho_vat_tu", name: "Queue thiếu vật tư", type: "grid" },
      { logicalKey: "qc_tuan_nay", table: "qc_ban_giao", name: "QC bàn giao tuần này", type: "grid" },
    ],
    forms: [
      { logicalKey: "form_co_hoi", table: "co_hoi", name: "Form nhập lead / cơ hội mới" },
      { logicalKey: "form_don_hang", table: "don_hang", name: "Form xác nhận đơn / bàn giao garage" },
      { logicalKey: "form_lenh_do", table: "lenh_do_xe", name: "Form yêu cầu độ xe" },
      { logicalKey: "form_giu_cho", table: "giu_cho_vat_tu", name: "Form cập nhật giữ chỗ vật tư" },
      { logicalKey: "form_qc", table: "qc_ban_giao", name: "Form QC trước bàn giao" },
    ],
    dashboard: {
      logicalKey: "bod_control_tower",
      name: "BOD Control Tower - Sales Garage",
      blocks: [
        { logicalKey: "dashboard_help", name: "Cách đọc dashboard", type: "text", text: "Ưu tiên xem đơn trễ, garage đang kẹt, vật tư thiếu và QC giữ bàn giao." },
        { logicalKey: "open_opportunities", name: "Tổng cơ hội", type: "statistics", table: "co_hoi" },
        { logicalKey: "orders_by_status", name: "Đơn hàng theo trạng thái", type: "column", table: "don_hang", dimension: "Trạng thái đơn" },
        { logicalKey: "garage_by_status", name: "Lệnh garage theo trạng thái", type: "column", table: "lenh_do_xe", dimension: "Trạng thái garage" },
        { logicalKey: "materials_by_status", name: "Giữ chỗ vật tư theo trạng thái", type: "column", table: "giu_cho_vat_tu", dimension: "Trạng thái giữ chỗ" },
      ],
    },
    sampleRecords: {
      nhan_su: [
        { "Tên nhân sự": "Nguyễn Minh An", "Vai trò": "Trưởng sale", "Nhóm": "Sales 1", "Đang hoạt động": true },
        { "Tên nhân sự": "Trần Thu Hà", "Vai trò": "Admin sales", "Nhóm": "Vận hành", "Đang hoạt động": true },
        { "Tên nhân sự": "Lê Quốc Huy", "Vai trò": "Garage", "Nhóm": "Garage chính", "Đang hoạt động": true },
        { "Tên nhân sự": "Phạm Gia Bảo", "Vai trò": "QC", "Nhóm": "Bàn giao", "Đang hoạt động": true },
      ],
      khach_hang: [
        { "Tên khách hàng": "Công ty Minh Phát", "Loại khách hàng": "Doanh nghiệp", "Tỉnh/Thành": "TP.HCM", "Phân khúc": "Tải trung" },
        { "Tên khách hàng": "Vận tải Hưng Thịnh", "Loại khách hàng": "Doanh nghiệp", "Tỉnh/Thành": "Bình Dương", "Phân khúc": "Xe chuyên dụng" },
      ],
      xe_ton: [
        { "Mã xe": "XE-001", "Hãng": "Isuzu", "Model": "NQR", "Phân khúc": "Tải trung", "Tải trọng tấn": 5.5, "Trạng thái xe": "Đã giữ chỗ", "Vị trí": "Bãi xe" },
        { "Mã xe": "XE-002", "Hãng": "Hino", "Model": "XZU", "Phân khúc": "Tải nhẹ", "Tải trọng tấn": 3.5, "Trạng thái xe": "Đang ở garage", "Vị trí": "Garage" },
      ],
      co_hoi: [
        { "Tên cơ hội": "Minh Phát - Isuzu thùng kín", "Nguồn lead": "Giới thiệu", "Phân khúc xe": "Tải trung", "Model mong muốn": "NQR", "Giai đoạn": "Đã chốt đơn", "Giá trị ước tính": 980000000, "Xác suất %": 100, "Nhu cầu độ xe": ["Thùng"] },
        { "Tên cơ hội": "Hưng Thịnh - xe đông lạnh", "Nguồn lead": "Showroom", "Phân khúc xe": "Xe chuyên dụng", "Model mong muốn": "Hino XZU", "Giai đoạn": "Ý định cao", "Giá trị ước tính": 1250000000, "Xác suất %": 80, "Nhu cầu độ xe": ["Dàn lạnh"] },
      ],
      don_hang: [
        { "Mã đơn": "DH-001", "Trạng thái cọc": "Đã cọc", "Trạng thái hồ sơ": "Đủ", "Trạng thái đơn": "Đang ở garage", "Giá trị đơn": 980000000 },
        { "Mã đơn": "DH-002", "Trạng thái cọc": "Đã cọc", "Trạng thái hồ sơ": "Đang xử lý", "Trạng thái đơn": "Giữ bàn giao", "Giá trị đơn": 1250000000 },
      ],
      lenh_do_xe: [
        { "Mã lệnh": "GJ-001", "Loại độ xe": "Thùng", "Tóm tắt spec": "Thùng kín tiêu chuẩn", "Trạng thái garage": "Đang làm", "Ưu tiên": "Cao" },
        { "Mã lệnh": "GJ-002", "Loại độ xe": "Dàn lạnh", "Tóm tắt spec": "Dàn lạnh âm 18 độ", "Trạng thái garage": "Đang kẹt", "Lý do kẹt": "Thiếu cụm máy nén", "Ưu tiên": "Khẩn" },
      ],
      vat_tu: [
        { "Mã vật tư": "VT-001", "Tên vật tư": "Cụm máy nén lạnh", "Nhóm vật tư": "Dàn lạnh", "Đơn vị": "Bộ", "Tồn hiện có": 1, "Đã giữ chỗ": 1, "Khả dụng": 0, "Mức đặt lại": 2, "Trạng thái tồn": "Thiếu" },
        { "Mã vật tư": "VT-002", "Tên vật tư": "Tấm panel thùng", "Nhóm vật tư": "Thùng", "Đơn vị": "Tấm", "Tồn hiện có": 20, "Đã giữ chỗ": 8, "Khả dụng": 12, "Mức đặt lại": 10, "Trạng thái tồn": "Đủ" },
      ],
      giu_cho_vat_tu: [
        { "Mã giữ chỗ": "RS-001", "SL cần": 1, "SL đã giữ": 0, "Trạng thái giữ chỗ": "Đã đặt", "Ghi chú": "Nhà cung cấp hẹn giao trong tuần" },
        { "Mã giữ chỗ": "RS-002", "SL cần": 8, "SL đã giữ": 8, "Trạng thái giữ chỗ": "Đã giữ" },
      ],
      qc_ban_giao: [
        { "Mã QC": "QC-001", "Đã kiểm tra xe": true, "Đã kiểm tra phần độ": true, "Đã kiểm tra hồ sơ": true, "Đã kiểm tra thanh toán": true, "Sẵn sàng bàn giao": true, "Trạng thái QC": "Đạt" },
        { "Mã QC": "QC-002", "Đã kiểm tra xe": true, "Đã kiểm tra phần độ": false, "Đã kiểm tra hồ sơ": true, "Đã kiểm tra thanh toán": false, "Sẵn sàng bàn giao": false, "Trạng thái QC": "Giữ bàn giao", "Ghi chú": "Chờ hoàn tất dàn lạnh và thanh toán" },
      ],
    },
  };
}
