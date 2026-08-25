import { useEffect, useState } from 'react'
import { Lock, LockOpen, Trash2 } from 'lucide-react'
import { Btn, Table, Badge, Spinner, Modal, Field, Input, ErrorBox, TinyBtn, FilterBar, Select, Pagination } from '../components/ui'
import { api, ApiError, type Staff, type StaffRole, type SecurityLog } from '../lib/api'
import { staffRoleLabel, staffStatusLabel } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/dialog'

const placeholderSections = [
  ['Thông tin cửa hàng', 'Tên, địa chỉ, hotline, logo'],
  ['Danh mục sản phẩm', 'Cấu hình danh mục và thuộc tính'],
  ['Nhà cung cấp', 'Danh sách và thông tin nhà cung cấp'],
  ['Phương thức thanh toán', 'Tiền mặt, chuyển khoản, thẻ, QR'],
  ['Cấu hình hóa đơn', 'Mẫu hóa đơn, thông tin in ấn'],
  ['Cảnh báo tồn kho', 'Ngưỡng cảnh báo sắp hết hàng'],
]

const permissionMatrix: [string, boolean, boolean, boolean, boolean][] = [
  ['Dashboard', true, true, true, true],
  ['Đơn hàng', true, true, true, true],
  ['Kho hàng', true, true, false, true],
  ['Sản phẩm', true, true, false, true],
  ['Khách hàng', true, true, true, true],
  ['Hóa đơn', true, true, true, true],
  ['Doanh thu', true, true, true, true],
  ['Thu / Chi', true, true, true, false],
  ['Kế toán', true, false, true, false],
  ['Báo cáo', true, true, true, true],
  ['Cài đặt (quản lý người dùng)', true, false, false, false],
]

export function CaiDatScreen() {
  const dialog = useDialog()
  const { staff: currentStaff } = useAuth()
  const [users, setUsers] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const isAdmin = currentStaff?.vaiTro === 'ADMIN'

  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [securityLogTotal, setSecurityLogTotal] = useState(0)
  const [securityLogPage, setSecurityLogPage] = useState(1)
  const [securityLogEvent, setSecurityLogEvent] = useState('')
  const [securityLogEventTypes, setSecurityLogEventTypes] = useState<string[]>([])
  const [securityLogLoading, setSecurityLogLoading] = useState(true)
  const securityLogPageSize = 20

  function reload() {
    if (!isAdmin) { setLoading(false); return }
    setLoading(true)
    api.staff.list().then(res => { setUsers(res); setLoading(false) })
  }
  useEffect(reload, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    api.securityLogs.eventTypes().then(res => setSecurityLogEventTypes(res.items))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) { setSecurityLogLoading(false); return }
    setSecurityLogLoading(true)
    api.securityLogs.list({ event: securityLogEvent || undefined, page: securityLogPage, pageSize: securityLogPageSize })
      .then(res => { setSecurityLogs(res.items); setSecurityLogTotal(res.total); setSecurityLogLoading(false) })
  }, [isAdmin, securityLogEvent, securityLogPage])

  async function toggleLock(u: Staff) {
    const locking = u.trangThai === 'ACTIVE'
    const message = locking
      ? `Khóa tài khoản "${u.hoTen}"? Nhân viên này sẽ không đăng nhập được nữa và mọi phiên đang mở của họ sẽ bị vô hiệu hóa ngay.`
      : `Mở khóa tài khoản "${u.hoTen}"?`
    if (!(await dialog.confirm(message, locking ? { confirmLabel: 'Khóa' } : { danger: false, confirmLabel: 'Mở khóa' }))) return
    setDeleteError(null)
    try {
      await api.staff.update(u.id, { trangThai: locking ? 'LOCKED' : 'ACTIVE' })
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái tài khoản.')
    }
  }

  async function handleDelete(u: Staff) {
    if (!(await dialog.confirm(`Xóa nhân viên "${u.hoTen}"? Chỉ xóa được nếu tài khoản này chưa tạo/xử lý dữ liệu gì. Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.staff.delete(u.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa nhân viên.')
    }
  }

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {placeholderSections.map(([title, desc]) => (
          <div key={title} className="bg-white rounded-lg border border-slate-200 p-3 text-left opacity-60 cursor-not-allowed relative">
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            <div className="text-[10px] text-amber-600 mt-1">Chưa khả dụng</div>
          </div>
        ))}
      </div>

      {!isAdmin ? (
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs text-slate-500">
          Chỉ Administrator mới có quyền quản lý người dùng hệ thống.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">Người dùng hệ thống</h2>
            <Btn small onClick={() => setShowCreate(true)}>+ Thêm người dùng</Btn>
          </div>
          {deleteError && <ErrorBox message={deleteError} />}
          {loading ? <Spinner /> : (
            <Table
              cols={['Thao tác', 'Họ tên', 'Email', 'Vai trò', 'Trạng thái']}
              rows={users.map(u => [
                u.id === currentStaff?.id ? '—' : (
                  <div className="flex gap-1">
                    <TinyBtn danger={u.trangThai === 'ACTIVE'} title={u.trangThai === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} onClick={() => toggleLock(u)}>
                      {u.trangThai === 'ACTIVE' ? <Lock size={12} strokeWidth={1.75} /> : <LockOpen size={12} strokeWidth={1.75} />}
                    </TinyBtn>
                    <TinyBtn danger title="Xóa" onClick={() => handleDelete(u)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>
                  </div>
                ),
                <span className="block max-w-[140px] truncate font-semibold text-slate-800" title={u.hoTen}>{u.hoTen}</span>,
                u.email, staffRoleLabel[u.vaiTro],
                <Badge label={staffStatusLabel[u.trangThai ?? 'ACTIVE']} />,
              ])}
            />
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Ma trận phân quyền</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-500">Chức năng</th>
                {['Administrator', 'Manager', 'Accountant', 'Inventory Staff'].map(r => (
                  <th key={r} className="text-center py-2 px-3 font-semibold text-slate-500">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map(([fn, ...perms]) => (
                <tr key={fn as string} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-700">{fn}</td>
                  {(perms as boolean[]).map((p, i) => (
                    <td key={i} className="py-2 px-3 text-center">
                      {p ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Nhật ký bảo mật</h2>
          <p className="text-xs text-slate-400 mb-3">Các lượt bị từ chối vì sai token, hết quyền, vượt giới hạn request, hoặc sai secret/IP webhook thanh toán.</p>
          <FilterBar>
            <Select
              placeholder="Loại sự kiện"
              options={securityLogEventTypes}
              value={securityLogEvent}
              onChange={v => { setSecurityLogEvent(v); setSecurityLogPage(1) }}
            />
          </FilterBar>
          {securityLogLoading ? <Spinner /> : securityLogs.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">Chưa có sự kiện bảo mật nào bị ghi nhận</div>
          ) : (
            <>
              <Table
                cols={['Thời gian', 'Sự kiện', 'Chi tiết']}
                rows={securityLogs.map(log => [
                  new Date(log.createdAt).toLocaleString('vi-VN'),
                  <span className="font-mono text-[10px] font-semibold text-red-600">{log.event}</span>,
                  <span className="text-[10px] text-slate-500">
                    {Object.entries(log.detail ?? {}).map(([k, v]) => `${k}=${String(v)}`).join(' · ') || '—'}
                  </span>,
                ])}
              />
              <Pagination total={securityLogTotal} page={securityLogPage} pageSize={securityLogPageSize} onChange={setSecurityLogPage} />
            </>
          )}
        </div>
      )}

      {showCreate && <CreateStaffModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}

function CreateStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [hoTen, setHoTen] = useState('')
  const [email, setEmail] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [vaiTro, setVaiTro] = useState<StaffRole>('MANAGER')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!hoTen || !email || matKhau.length < 6) { setError('Vui lòng nhập đầy đủ thông tin (mật khẩu tối thiểu 6 ký tự).'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.staff.create({ hoTen, email, matKhau, vaiTro })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo người dùng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Thêm người dùng" onClose={onClose}>
      <ErrorBox message={error} />
      <Field label="Họ tên"><Input value={hoTen} onChange={e => setHoTen(e.target.value)} /></Field>
      <Field label="Email"><Input value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Mật khẩu"><Input type="password" value={matKhau} onChange={e => setMatKhau(e.target.value)} /></Field>
      <Field label="Vai trò">
        <select value={vaiTro} onChange={e => setVaiTro(e.target.value as StaffRole)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white">
          {Object.entries(staffRoleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
