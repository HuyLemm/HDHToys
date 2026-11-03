import { useState } from 'react'
import { HdhLogo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!email || !pass) { setError('Vui lòng nhập đầy đủ thông tin.'); return }
    setError('')
    setLoading(true)
    try {
      await login(email, pass, remember)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể kết nối đến máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f0f4fa' }}>
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-10 text-white" style={{ background: '#0f172a' }}>
        <HdhLogo />
        <div>
          <h1 className="text-3xl font-bold mb-3 leading-tight">Hệ thống quản lý<br />bán lẻ đồ chơi</h1>
          <p className="text-sm opacity-60 leading-relaxed">Theo dõi doanh thu, quản lý kho hàng, đơn hàng và khách hàng toàn diện trong một nền tảng duy nhất.</p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {['Quản lý kho', 'Theo dõi đơn hàng', 'Báo cáo doanh thu', 'Hồ sơ khách hàng'].map(text => (
              <div key={text} className="text-sm opacity-70 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs opacity-40">© 2026 HDH Toys. All rights reserved.</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><HdhLogo /></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Đăng nhập hệ thống</h2>
          <p className="text-sm text-slate-500 mb-6">HDH Toys Management System</p>
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-semibold text-slate-700 block mb-1.5">Email hoặc tên đăng nhập</label>
              <input id="login-email" name="username" autoComplete="username" autoFocus value={email} onChange={e => setEmail(e.target.value)}
                aria-invalid={!!error && !email} aria-describedby={error ? 'login-error' : undefined}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="admin@hdhtoys.vn" />
            </div>
            <div>
              <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 block mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input id="login-password" name="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} type={showPass ? 'text' : 'password'}
                  aria-invalid={!!error && !pass} aria-describedby={error ? 'login-error' : undefined}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-14"
                  placeholder="Nhập mật khẩu" />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-pressed={showPass}
                  aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer rounded">
                  {showPass ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded" checked={remember} onChange={e => setRemember(e.target.checked)} /> Ghi nhớ đăng nhập
              </label>
              <span className="text-slate-500">Quên mật khẩu? Liên hệ quản trị viên.</span>
            </div>
            {error && <div id="login-error" role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-70"
              style={{ background: '#1a56db' }}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <div className="text-center text-xs text-slate-500 flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span>Chỉ dành cho nhân viên được ủy quyền</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
