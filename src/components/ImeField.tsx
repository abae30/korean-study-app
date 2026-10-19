import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { HangulBuffer, jamoForKey } from '../lib/composer'
import { flatten } from '../lib/hangul'

export interface ImeFieldHandle {
  /** Empty the field and cleanly abandon any in-progress composition. */
  clear: () => void
  focus: () => void
  value: () => string
}

interface Props {
  disabled?: boolean
  /**
   * Type Korean on a regular (English) keyboard: letter keys are turned into 2-set jamo and composed here, so the
   * OS input source doesn't matter. If a Korean input source is active it still works (its keystrokes are left alone).
   */
  builtin?: boolean
  /** Called on every change, including mid-composition. */
  onValue: (value: string, composing: boolean) => void
  /**
   * Key handler. `composing` is true while the IME is mid-syllable: Enter then merely commits the syllable,
   * so handlers should usually ignore it.
   */
  onKey?: (e: React.KeyboardEvent<HTMLInputElement>, composing: boolean) => void
  className?: string
}

/**
 * A text input built for Hangul IMEs. It is uncontrolled (React never writes to it mid-composition, which would cancel
 * the composition) and stays focused so you can just type.
 */
export const ImeField = forwardRef<ImeFieldHandle, Props>(function ImeField({ disabled, builtin = true, onValue, onKey, className = '' }, ref) {
  const el = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const buffer = useRef(new HangulBuffer())

  const emit = () => {
    const i = el.current
    if (!i) return
    i.value = buffer.current.text()
    onValue(i.value, false)
  }

  useImperativeHandle(ref, () => ({
    clear() {
      const i = el.current
      if (!i) return
      // Blur ends any live composition; only then is it safe to reset the value.
      i.blur()
      i.value = ''
      composing.current = false
      buffer.current.clear()
      requestAnimationFrame(() => i.focus())
    },
    focus: () => el.current?.focus(),
    value: () => el.current?.value ?? '',
  }))

  useEffect(() => {
    if (!disabled) el.current?.focus()
  }, [disabled])

  return (
    <input
      ref={el}
      disabled={disabled}
      lang="ko"
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Type the Korean answer"
      className={className}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        buffer.current.setText(flatten(e.currentTarget.value))
        onValue(e.currentTarget.value, false)
      }}
      onInput={(e) => {
        // text that came from a native IME (or paste): keep our keystroke buffer in step with it
        const native = e.nativeEvent as InputEvent
        buffer.current.setText(flatten(e.currentTarget.value))
        onValue(e.currentTarget.value, composing.current || !!native.isComposing)
      }}
      onKeyDown={(e) => {
        // keyCode 229 = "IME is handling this key" (Safari reports it after compositionend, Chrome during composition)
        const isComposing = composing.current || e.nativeEvent.isComposing || e.keyCode === 229
        if (builtin && !isComposing && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const jamo = jamoForKey(e.code, e.shiftKey)
          if (jamo) {
            e.preventDefault()
            buffer.current.push(jamo)
            return emit()
          }
          if (e.key === 'Backspace') {
            e.preventDefault()
            buffer.current.pop()
            return emit()
          }
          if (e.key.length === 1) {
            // digits, space and punctuation go in as typed
            e.preventDefault()
            buffer.current.push(e.key)
            return emit()
          }
        }
        onKey?.(e, isComposing)
      }}
      onBlur={() => {
        // keep typing focus unless the user deliberately clicked another control
        setTimeout(() => {
          if (!disabled && document.activeElement === document.body) el.current?.focus()
        }, 0)
      }}
    />
  )
})
