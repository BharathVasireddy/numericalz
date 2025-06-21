'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { 
  Building2, 
  Edit3, 
  Check, 
  X, 
  Copy, 
  BarChart3, 
  Settings, 
  Trash2,
  Star,
  Receipt,
  Archive,
  UserPlus,
  Calendar,
  FileText
} from 'lucide-react'

interface ClientActionDropdownProps {
  clientId?: string
  clientName?: string
  onEditName?: (newName: string) => void
  onFavorite?: (isFavorite: boolean) => void
  onCreateVATQuarter?: () => void
  onDuplicateClient?: () => void
  onViewAnalytics?: () => void
  onAssignUser?: () => void
  onClientSettings?: () => void
  onArchiveClient?: () => void
  onDeleteClient?: () => void
  isFavorite?: boolean
  className?: string
}

export const ClientActionDropdown = ({ 
  clientId,
  clientName = "Client",
  onEditName,
  onFavorite,
  onCreateVATQuarter,
  onDuplicateClient,
  onViewAnalytics,
  onAssignUser,
  onClientSettings,
  onArchiveClient,
  onDeleteClient,
  isFavorite = false,
  className
}: ClientActionDropdownProps) => {
  const [favorite, setFavorite] = useState(isFavorite)
  const [animating, setAnimating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedName, setEditedName] = useState(clientName)
  const ref = useRef<HTMLInputElement>(null)

  const [holding, setHolding] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const maxTime = 1500 // Slightly longer for delete confirmation

  useEffect(() => {
    if (animating)
      setTimeout(() => {
        setAnimating(false)
      }, 150)
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
    if (editedName.trim() && editedName !== clientName) {
      onEditName?.(editedName.trim())
    }
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
  }, [holding, elapsedTime, maxTime, onDeleteClient])

  const widthPercentage = (elapsedTime / maxTime) * 100

  return (
    <div className={cn(
      "flex w-72 flex-col items-start gap-y-1 rounded-xl border border-gray-200 bg-white/95 backdrop-blur-sm p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800/95",
      className
    )}>
      {/* Client Favorite */}
      <button
        className="relative flex w-full items-center justify-end overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 transition-all duration-200"
        onClick={handleFavoriteToggle}
      >
        <AnimatePresence mode="wait">
          {favorite ? (
            <motion.span
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="remove"
              className="absolute left-0 ml-3 text-gray-700 dark:text-gray-300"
            >
              Remove from Favorites
            </motion.span>
          ) : (
            <motion.span
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="add"
              className="absolute left-0 ml-3 text-gray-700 dark:text-gray-300"
            >
              Add to Favorites
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div
          animate={{ scale: animating ? 1.3 : 1 }}
          transition={{ duration: 0.2 }}
          className="mr-1"
        >
          <Star 
            className={clsx(
              "h-4 w-4 transition-all duration-200",
              favorite 
                ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" 
                : "text-gray-400 dark:text-gray-500 hover:text-yellow-400"
            )} 
          />
        </motion.div>
      </button>

      {/* Edit Client Name */}
      <div className="group relative flex h-10 w-full cursor-pointer items-center overflow-hidden rounded-lg text-sm">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="editing"
              className="absolute left-0 flex w-full items-center justify-between px-3"
            >
              <input 
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="flex-1 bg-transparent outline-none font-medium text-gray-700 dark:text-gray-300" 
                ref={ref}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') handleNameCancel()
                }}
                placeholder="Enter client name"
              />
              <div className="flex items-center gap-x-2 ml-2">
                <button
                  className="rounded-md bg-green-100 p-1.5 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700 transition-colors"
                  onClick={handleNameSave}
                  title="Save changes"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-md bg-red-100 p-1.5 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700 transition-colors"
                  onClick={handleNameCancel}
                  title="Cancel editing"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="display"
              className="absolute flex w-full items-center px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => {
                setEditing(true)
                setTimeout(() => ref.current?.focus(), 150)
              }}
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">Edit Client Name</span>
              <Edit3 className="absolute right-0 mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            </motion.button>
          )}
        </AnimatePresence>
        <div
          className={clsx(
            'pointer-events-none absolute left-0 h-full w-full bg-gray-100 dark:bg-gray-700 rounded-lg transition-opacity duration-200',
            editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-gray-600 my-1" />

      {/* Client Actions */}
      <div className="w-full space-y-1">
        <button 
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
          onClick={onCreateVATQuarter}
        >
          <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">Create VAT Quarter</span>
          <Receipt className="h-4 w-4 text-blue-500 group-hover:text-blue-600" />
        </button>

        <button 
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group"
          onClick={onDuplicateClient}
        >
          <span className="text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-300">Duplicate Client</span>
          <Copy className="h-4 w-4 text-green-500 group-hover:text-green-600" />
        </button>

        <button 
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
          onClick={onViewAnalytics}
        >
          <span className="text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">View Analytics</span>
          <BarChart3 className="h-4 w-4 text-purple-500 group-hover:text-purple-600" />
        </button>

        <button 
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
          onClick={onAssignUser}
        >
          <span className="text-gray-700 dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-300">Assign to User</span>
          <UserPlus className="h-4 w-4 text-orange-500 group-hover:text-orange-600" />
        </button>

        <button 
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          onClick={onClientSettings}
        >
          <span className="text-gray-700 dark:text-gray-300">Client Settings</span>
          <Settings className="h-4 w-4 text-gray-500 group-hover:text-gray-600" />
        </button>
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-gray-600 my-1" />

      {/* Archive Action */}
      <button 
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-yellow-700 dark:text-yellow-400 group"
        onClick={onArchiveClient}
      >
        <span className="group-hover:text-yellow-800 dark:group-hover:text-yellow-300">Archive Client</span>
        <Archive className="h-4 w-4 group-hover:text-yellow-800 dark:group-hover:text-yellow-300" />
      </button>

      {/* Delete Action with Hold to Confirm */}
      <button
        className="group relative flex h-10 w-full select-none items-center justify-end overflow-hidden rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
      >
        <AnimatePresence mode="wait">
          {holding ? (
            <motion.span
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="holding"
              className="absolute left-0 ml-3 select-none text-red-700 dark:text-red-400"
            >
              Hold to Confirm Delete
            </motion.span>
          ) : (
            <motion.span
              className="absolute left-0 ml-3 select-none"
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              key="delete"
            >
              Delete Client
            </motion.span>
          )}
        </AnimatePresence>
        <Trash2 className="h-4 w-4" />
        <div className="absolute left-0 h-full w-full bg-red-100 dark:bg-red-900/30 rounded-lg transition-opacity opacity-0 group-hover:opacity-100">
          <motion.div
            className="h-full bg-red-200 dark:bg-red-800/50 rounded-lg"
            initial={{ width: 0 }}
            animate={{ width: `${widthPercentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </button>
    </div>
  )
} 