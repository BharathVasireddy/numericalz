'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { 
  Building2, 
  Calculator, 
  FileText, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  Copy, 
  BarChart3, 
  Settings, 
  Trash2,
  Star,
  Receipt,
  Calendar,
  Archive
} from 'lucide-react'

interface AccountingActionDropdownProps {
  clientName?: string
  onEditName?: (newName: string) => void
  onFavorite?: (isFavorite: boolean) => void
  onNewVATQuarter?: () => void
  onDuplicateClient?: () => void
  onViewAnalytics?: () => void
  onAssignUser?: () => void
  onClientSettings?: () => void
  onArchiveClient?: () => void
  onDeleteClient?: () => void
  isFavorite?: boolean
  className?: string
}

export const AccountingActionDropdown = ({ 
  clientName = "Client",
  onEditName,
  onFavorite,
  onNewVATQuarter,
  onDuplicateClient,
  onViewAnalytics,
  onAssignUser,
  onClientSettings,
  onArchiveClient,
  onDeleteClient,
  isFavorite = false,
  className
}: AccountingActionDropdownProps) => {
  const [favorite, setFavorite] = useState(isFavorite)
  const [animating, setAnimating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedName, setEditedName] = useState(clientName)
  const ref = useRef<HTMLInputElement>(null)

  const [holding, setHolding] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const maxTime = 1000

  useEffect(() => {
    if (animating)
      setTimeout(() => {
        setAnimating(false)
      }, 100)
  }, [animating])

  const handleStart = () => {
    setHolding(true)
  }

  const handleEnd = () => {
    setHolding(false)
    setElapsedTime(0)
  }

  const handleFavoriteToggle = () => {
    const newFavorite = !favorite
    setFavorite(newFavorite)
    setAnimating(true)
    onFavorite?.(newFavorite)
  }

  const handleNameSave = () => {
    setEditing(false)
    onEditName?.(editedName)
  }

  const handleNameCancel = () => {
    setEditing(false)
    setEditedName(clientName)
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined

    if (holding) {
      timer = setInterval(() => {
        setElapsedTime((prev) => Math.min(prev + 100, maxTime))
      }, 100)
    } else if (!holding && elapsedTime > 0) {
      clearInterval(timer)
      if (elapsedTime >= maxTime) {
        onDeleteClient?.()
      }
    }

    return () => clearInterval(timer)
  }, [holding, elapsedTime, onDeleteClient])

  const widthPercentage = (elapsedTime / maxTime) * 100

  return (
    <div className={cn(
      "flex w-64 flex-col items-start gap-y-1 rounded-lg border border-neutral-300 bg-white/95 backdrop-blur-sm p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800/95",
      className
    )}>
      {/* Favorite Toggle */}
      <button
        className="relative flex w-full items-center justify-end overflow-hidden rounded px-3 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 transition-colors"
        onClick={handleFavoriteToggle}
      >
        <AnimatePresence>
          {favorite ? (
            <motion.span
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={0}
              className="absolute left-0 ml-3 font-medium"
            >
              Remove from Favorites
            </motion.span>
          ) : (
            <motion.span
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={1}
              className="absolute left-0 ml-3 font-medium"
            >
              Add to Favorites
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div
          animate={{ scale: animating ? 1.2 : 1 }}
          className="mr-1"
        >
          <Star 
            className={clsx(
              "h-4 w-4 transition-colors",
              favorite 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-neutral-500 dark:text-neutral-400"
            )} 
          />
        </motion.div>
      </button>

      {/* Edit Client Name */}
      <div className="group relative flex h-9 w-full cursor-pointer items-center overflow-hidden rounded text-sm">
        <AnimatePresence>
          {editing ? (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={0}
              className="absolute left-0 flex w-full items-center justify-between px-3"
            >
              <input 
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-3/4 bg-transparent outline-none font-medium" 
                ref={ref}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') handleNameCancel()
                }}
              />
              <div className="flex items-center gap-x-1">
                <button
                  className="rounded bg-green-100 p-1 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700 transition-colors"
                  onClick={handleNameSave}
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  className="rounded bg-red-100 p-1 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700 transition-colors"
                  onClick={handleNameCancel}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={1}
              className="absolute flex w-full items-center px-3 py-2"
              onClick={() => {
                setEditing(true)
                setTimeout(() => ref.current?.focus(), 100)
              }}
            >
              <span className="font-medium">Edit Client Name</span>
              <Edit3 className="absolute right-0 mr-3 h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <div
          className={clsx(
            'pointer-events-none absolute left-0 h-full w-full bg-neutral-100 dark:bg-neutral-700 transition-opacity',
            editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      <hr className="w-full border-neutral-200 dark:border-neutral-600" />

      {/* Client Actions */}
      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onNewVATQuarter}
      >
        <span className="font-medium">Create VAT Quarter</span>
        <Receipt className="h-4 w-4 text-blue-500" />
      </button>

      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onDuplicateClient}
      >
        <span className="font-medium">Duplicate Client</span>
        <Copy className="h-4 w-4 text-green-500" />
      </button>

      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onViewAnalytics}
      >
        <span className="font-medium">View Analytics</span>
        <BarChart3 className="h-4 w-4 text-purple-500" />
      </button>

      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onAssignUser}
      >
        <span className="font-medium">Assign to User</span>
        <Building2 className="h-4 w-4 text-orange-500" />
      </button>

      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onClientSettings}
      >
        <span className="font-medium">Client Settings</span>
        <Settings className="h-4 w-4 text-gray-500" />
      </button>

      <hr className="w-full border-neutral-200 dark:border-neutral-600" />

      {/* Archive Action */}
      <button 
        className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-yellow-700 dark:text-yellow-400"
        onClick={onArchiveClient}
      >
        <span className="font-medium">Archive Client</span>
        <Archive className="h-4 w-4" />
      </button>

      {/* Delete Action with Hold to Confirm */}
      <button
        className="group relative flex h-9 w-full select-none items-center justify-end overflow-hidden rounded px-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
      >
        <AnimatePresence>
          {holding ? (
            <motion.span
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={0}
              className="absolute left-0 ml-3 select-none font-medium"
            >
              Hold to Confirm Delete
            </motion.span>
          ) : (
            <motion.span
              className="absolute left-0 ml-3 select-none font-medium"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              key={1}
            >
              Delete Client
            </motion.span>
          )}
        </AnimatePresence>
        <Trash2 className="h-4 w-4" />
        <div className="absolute left-0 h-full w-full bg-red-100 dark:bg-red-900/30 transition-opacity opacity-0 group-hover:opacity-100">
          <motion.div
            className="h-full bg-red-200 dark:bg-red-800/50"
            initial={{ width: 0 }}
            animate={{ width: `${widthPercentage}%` }}
          />
        </div>
      </button>
    </div>
  )
} 