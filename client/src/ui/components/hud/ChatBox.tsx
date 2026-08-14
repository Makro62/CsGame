import { useState, useEffect, useRef } from 'react'
import { useNetworkStore, type ChatMessage } from '../../../stores/useNetworkStore'
import { cn } from '../../../utils/cn'

export function ChatBox() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const { connected, sendChat, chatMessages } = useNetworkStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && connected) {
        if (isOpen && inputValue.trim()) {
          sendChat(inputValue.trim())
          setInputValue('')
          setIsOpen(false)
        } else if (!isOpen) {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setInputValue('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, inputValue, connected, sendChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  if (!connected) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-5 w-[300px] z-[150]',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {/* Messages */}
      <div
        className={cn(
          'max-h-[200px] overflow-y-auto mb-2 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-70'
        )}
      >
        {chatMessages.map(msg => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isOpen && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type a message..."
          maxLength={100}
          className="w-full px-3 py-2 text-sm font-mono bg-bg-primary/80 border border-white/20 rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-gold/50 transition-colors"
        />
      )}

      {/* Hint */}
      {!isOpen && (
        <div className="text-[11px] text-text-muted bg-bg-primary/30 px-2 py-1 rounded inline-block">
          Press ENTER to chat
        </div>
      )}
    </div>
  )
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const teamColor =
    message.team === 'CT'
      ? 'text-armor'
      : message.team === 'T'
        ? 'text-terrorist'
        : 'text-accent-gold'

  return (
    <div className="px-2 py-1 mb-0.5 bg-bg-primary/50 rounded text-xs text-text-primary">
      <span className={cn('font-bold', teamColor)}>
        {message.sender}:{' '}
      </span>
      <span>{message.message}</span>
    </div>
  )
}
