import { useState, useCallback, useRef } from 'react'

interface ConfirmState {
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((title: string, message: string, opts?: { confirmLabel?: string; destructive?: boolean }): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ title, message, confirmLabel: opts?.confirmLabel, destructive: opts?.destructive ?? true })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    setState(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    setState(null)
  }, [])

  const ConfirmDialog = state ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleCancel}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-xs border border-slate-200 dark:border-slate-700 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-heading font-semibold text-slate-800 dark:text-white text-center mb-2">
          {state.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          {state.message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
              state.destructive !== false
                ? 'bg-red-500 active:bg-red-600'
                : 'bg-amber-500 active:bg-amber-600'
            }`}
          >
            {state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialog }
}
