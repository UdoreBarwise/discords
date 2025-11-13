import { ReactNode } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'danger' | 'warning'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className={`confirm-dialog ${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-dialog-body">
          {message}
        </div>
        <div className="confirm-dialog-actions">
          <button
            onClick={onCancel}
            className="confirm-dialog-button cancel"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`confirm-dialog-button confirm ${variant}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

