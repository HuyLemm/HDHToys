// Sinh chuỗi VietQR (chuẩn NAPAS 247, dựa trên EMVCo QR Code Specification for
// Payment Systems) — dùng để render QR động gắn số tiền + nội dung chuyển
// khoản cho một đơn hàng cụ thể (SRS FR-PAY.1, SDS mục 5.8).
//
// Đây là cách tự sinh payload cục bộ, không phụ thuộc dịch vụ ngoài để tạo
// ảnh QR. Trước khi dùng thật với một ngân hàng cụ thể, nên xác minh lại
// bằng công cụ kiểm tra VietQR chính thức (https://vietqr.io) vì một số ngân
// hàng có thể yêu cầu thêm trường tùy biến ngoài chuẩn tối thiểu này.

const NAPAS_GUID = "A000000727"
const SERVICE_CODE_TRANSFER_TO_ACCOUNT = "QRIBFTTA"

function tlv(id: string, value: string): string {
  // Độ dài trường TLV phải tính theo SỐ BYTE UTF-8 thật của value (chuẩn
  // EMVCo/NAPAS), không phải value.length (số code unit UTF-16 của JS) — hai
  // số này chỉ trùng nhau khi value thuần ASCII. Mọi giá trị hiện tại đều là
  // ASCII (accountName ép .toUpperCase() không dấu, các mã cố định...) nên
  // chưa từng lộ ra, nhưng nếu VIETQR_ACCOUNT_NAME sau này có dấu tiếng Việt,
  // dùng .length sẽ khai sai độ dài và làm hỏng mọi trường TLV phía sau.
  const byteLength = Buffer.byteLength(value, "utf8")
  return `${id}${String(byteLength).padStart(2, "0")}${value}`
}

function crc16Ccitt(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export interface VietQrParams {
  /** Mã BIN ngân hàng theo danh mục NAPAS, ví dụ Vietcombank = "970436". */
  bankBin: string
  accountNo: string
  accountName: string
  amount: number
  /** Nội dung chuyển khoản — PHẢI chứa mã đơn hàng để đối soát tự động (FR-PAY.3). */
  addInfo: string
}

export function buildVietQrPayload(params: VietQrParams): string {
  const { bankBin, accountNo, accountName, amount, addInfo } = params

  const beneficiaryOrg = tlv("00", bankBin) + tlv("01", accountNo)
  const merchantAccountInfo = tlv("00", NAPAS_GUID) + tlv("01", beneficiaryOrg) + tlv("02", SERVICE_CODE_TRANSFER_TO_ACCOUNT)
  const additionalData = tlv("08", addInfo)

  const fields =
    tlv("00", "01") + // Payload Format Indicator
    tlv("01", "12") + // Point of Initiation Method: 12 = dynamic (đã gắn số tiền cố định)
    tlv("38", merchantAccountInfo) +
    tlv("53", "704") + // Transaction Currency: 704 = VND
    tlv("54", String(Math.round(amount))) +
    tlv("58", "VN") +
    tlv("59", accountName.slice(0, 25).toUpperCase() || "HDH TOYS") +
    tlv("60", "HA NOI") +
    tlv("62", additionalData)

  const withCrcId = `${fields}6304`
  return `${withCrcId}${crc16Ccitt(withCrcId)}`
}
