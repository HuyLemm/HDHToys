import { createContext, useCallback, useContext, useState } from 'react'
import { Btn, Modal } from '../components/ui'

type ConfirmOptions = { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type AlertOptions = { title?: string }

interface PendingConfirm {
  kind: 'confirm'
  message: string
  options?: ConfirmOptions
  resolve: (value: boolean) => void
}
interface PendingAlert {
  kind: 'alert'
  message: string
  options?: AlertOptions
  resolve: () => void
}
type Pending = PendingConfirm | PendingAlert

interface DialogApi {
  /** Thay cho window.confirm — true khi bấm nút xác nhận, false khi Hủy/đóng modal. */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
  /** Thay cho window.alert. */
  alert: (message: string, options?: AlertOptions) => Promise<void>
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setPending({ kind: 'confirm', message, options, resolve })
    })
  }, [])

  const alertFn = useCallback((message: string, options?: AlertOptions) => {
    return new Promise<void>(resolve => {
      setPending({ kind: 'alert', message, options, resolve })
    })
  }, [])

  function close(result: boolean) {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(result)
    else pending.resolve()
    setPending(null)
  }

  return (
    <DialogContext.Provider value={{ confirm, alert: alertFn }}>
      {children}
      {pending && (
        <Modal title={pending.options?.title ?? (pending.kind === 'confirm' ? 'Xác nhận' : 'Thông báo')} onClose={() => close(false)}>
          <p className="text-xs text-slate-600 whitespace-pre-line mb-4">{pending.message}</p>
          <div className="flex gap-2">
            {pending.kind === 'confirm' ? (
              <>
                <Btn variant={pending.options?.danger === false ? 'primary' : 'danger'} onClick={() => close(true)}>
                  {pending.options?.confirmLabel ?? 'Xóa'}
                </Btn>
                <Btn variant="secondary" onClick={() => close(false)}>{pending.options?.cancelLabel ?? 'Hủy'}</Btn>
              </>
            ) : (
              <Btn onClick={() => close(true)}>Đóng</Btn>
            )}
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog phải dùng trong DialogProvider')
  return ctx
}
