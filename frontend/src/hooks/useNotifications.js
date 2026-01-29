import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

function getStorageKey(userId) {
  return `taskNotificationsNotified_${userId || 'guest'}`
}

function getNotifiedIds(userId) {
  try {
    const stored = sessionStorage.getItem(getStorageKey(userId))
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveNotifiedIds(ids, userId) {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(ids)))
  } catch {
    // Ignore storage errors
  }
}

export function useNotifications(reminders, enabled = true, hoursAhead = 24) {
  const { user } = useAuth()
  const notifiedIdsRef = useRef(getNotifiedIds(user?.id))

  useEffect(() => {
    if (!enabled || !reminders || !('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const showNotifications = () => {
      if (Notification.permission !== 'granted') return

      const overdueTasks = (reminders.overdueTasks || []).filter(t => !notifiedIdsRef.current.has(t.id))
      const upcomingTasks = (reminders.upcomingTasks || []).filter(t => !notifiedIdsRef.current.has(t.id))

      const hasOverdue = overdueTasks.length > 0
      const hasUpcoming = upcomingTasks.length > 0

      if (!hasOverdue && !hasUpcoming) return

      // Combined notification
      if (hasOverdue && hasUpcoming) {
        const overdueText = overdueTasks.length === 1 
          ? `1 overdue task` 
          : `${overdueTasks.length} overdue tasks`
        const upcomingText = upcomingTasks.length === 1 
          ? `1 task due soon` 
          : `${upcomingTasks.length} tasks due soon`
        const title = `📋 Task Reminders`
        const body = `${overdueText} and ${upcomingText} need your attention`
        showNotification(title, body, true, [...overdueTasks.map(t => t.id), ...upcomingTasks.map(t => t.id)])
      }
      // Overdue only
      else if (hasOverdue) {
        if (overdueTasks.length === 1) {
          const task = overdueTasks[0]
          const title = `⚠️ Overdue: ${task.title}`
          const body = `This task was due ${Math.abs(task.hoursUntilDue)} hours ago`
          showNotification(title, body, true, overdueTasks.map(t => t.id))
        } else {
          const title = `⚠️ ${overdueTasks.length} tasks are overdue`
          const body = `You have ${overdueTasks.length} overdue tasks that need attention`
          showNotification(title, body, true, overdueTasks.map(t => t.id))
        }
      }
      // Upcoming only
      else if (hasUpcoming) {
        if (upcomingTasks.length === 1) {
          const task = upcomingTasks[0]
          const title = `⏰ Due Soon: ${task.title}`
          const body = `Due in ${task.hoursUntilDue} hours`
          showNotification(title, body, false, upcomingTasks.map(t => t.id))
        } else {
          const title = `⏰ ${upcomingTasks.length} tasks due soon`
          const body = `You have ${upcomingTasks.length} tasks due within the next ${hoursAhead} hours`
          showNotification(title, body, false, upcomingTasks.map(t => t.id))
        }
      }
    }

    const showNotification = (title, body, requireInteraction, taskIds) => {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `tasks-${taskIds.join('-')}`,
        requireInteraction
      })

      taskIds.forEach(id => notifiedIdsRef.current.add(id))
      saveNotifiedIds(notifiedIdsRef.current, user?.id)
      
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }

    const timeoutId = setTimeout(showNotifications, 1000)
    return () => clearTimeout(timeoutId)
  }, [reminders, enabled, hoursAhead, user?.id])
}
