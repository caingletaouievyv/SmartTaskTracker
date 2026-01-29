import { useState } from 'react'

export function useDialog() {
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    inputValue: '',
    resolve: null
  })

  const alert = (message, title = '') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'alert',
        title,
        message,
        resolve
      })
    })
  }

  const confirm = (message, title = 'Confirm') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        resolve
      })
    })
  }

  const prompt = (message, defaultValue = '', title = 'Input') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        inputValue: defaultValue,
        resolve
      })
    })
  }

  const handleConfirm = () => {
    if (dialog.type === 'prompt') {
      dialog.resolve?.(dialog.inputValue)
    } else {
      dialog.resolve?.(true)
    }
    setDialog({ ...dialog, isOpen: false })
  }

  const handleCancel = () => {
    dialog.resolve?.(dialog.type === 'confirm' ? false : null)
    setDialog({ ...dialog, isOpen: false })
  }

  const handleInputChange = (value) => {
    setDialog({ ...dialog, inputValue: value })
  }

  return {
    dialog: {
      ...dialog,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      onInputChange: handleInputChange
    },
    alert,
    confirm,
    prompt
  }
}
