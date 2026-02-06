import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Megaphone,
  Clock,
  Tag,
  User,
  Check,
  CheckCheck,
} from 'lucide-react'

interface StudentAnnouncement {
  announcement_id: number
  class_id: number
  class_name: string
  subject_id: number | null
  subject_name: string | null
  teacher_name: string
  title: string
  content: string
  created_at: string
  is_read: boolean
  read_at: string | null
}

export default function StudentAnnouncements() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<StudentAnnouncement | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['studentAnnouncements'],
    queryFn: studentAPI.getAnnouncements,
  })

  const markReadMutation = useMutation({
    mutationFn: studentAPI.markAnnouncementRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentAnnouncements'] })
    },
  })

  const announcements = data?.announcements || []
  const unreadCount = data?.unread_count || 0

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const handleOpenAnnouncement = (announcement: StudentAnnouncement) => {
    setSelectedAnnouncement(announcement)
    if (!announcement.is_read) {
      markReadMutation.mutate(announcement.announcement_id)
    }
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/student')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-foreground">Announcements</h1>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-card rounded-2xl border py-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-heading font-semibold text-foreground mb-2">No announcements</h4>
            <p className="text-sm text-muted-foreground">
              You're all caught up! New announcements will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <button
                key={announcement.announcement_id}
                onClick={() => handleOpenAnnouncement(announcement)}
                className={`w-full text-left bg-card rounded-2xl border p-4 transition-all hover:shadow-lg ${
                  !announcement.is_read ? 'border-amber-300 dark:border-amber-700' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1">
                    {!announcement.is_read ? (
                      <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    ) : (
                      <CheckCheck className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {announcement.class_name}
                      </span>
                      {announcement.subject_name && (
                        <span className="text-xs text-muted-foreground">
                          {announcement.subject_name}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className={`font-heading font-semibold mb-1 ${
                      !announcement.is_read ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {announcement.title}
                    </h4>

                    {/* Content preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {announcement.content}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.teacher_name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-card rounded-t-3xl sm:rounded-2xl border shadow-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Tag className="h-3 w-3" />
                    {selectedAnnouncement.class_name}
                  </span>
                  {selectedAnnouncement.subject_name && (
                    <span className="text-xs text-muted-foreground">
                      {selectedAnnouncement.subject_name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <span className="text-sm font-medium">Close</span>
                </button>
              </div>

              <h3 className="font-heading font-bold text-xl text-foreground">
                {selectedAnnouncement.title}
              </h3>

              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {selectedAnnouncement.teacher_name}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(selectedAnnouncement.created_at)}
                </span>
                <span className="inline-flex items-center gap-1 text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  Read
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
