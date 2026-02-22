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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="ml-3">
              <h1 className="text-base font-heading font-bold text-foreground">Announcements</h1>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-card rounded-xl border py-10 text-center">
            <Megaphone className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {announcements.map((announcement) => (
              <button
                key={announcement.announcement_id}
                onClick={() => handleOpenAnnouncement(announcement)}
                className={`w-full text-left px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  !announcement.is_read ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Unread dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    {!announcement.is_read ? (
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    ) : (
                      <CheckCheck className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {announcement.class_name}
                      </span>
                      {announcement.subject_name && (
                        <span className="text-[10px] text-muted-foreground truncate">{announcement.subject_name}</span>
                      )}
                    </div>

                    <p className={`text-sm font-medium mb-0.5 truncate ${!announcement.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {announcement.title}
                    </p>

                    <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">
                      {announcement.content}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <User className="h-2.5 w-2.5" />
                        {announcement.teacher_name}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
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

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-card rounded-t-2xl border-t shadow-2xl w-full max-w-lg max-h-[75vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                    <Tag className="h-2.5 w-2.5 inline mr-0.5" />
                    {selectedAnnouncement.class_name}
                  </span>
                  {selectedAnnouncement.subject_name && (
                    <span className="text-[11px] text-muted-foreground">{selectedAnnouncement.subject_name}</span>
                  )}
                </div>
                <button onClick={() => setSelectedAnnouncement(null)} className="text-xs text-muted-foreground font-medium">
                  Close
                </button>
              </div>

              <h3 className="font-heading font-bold text-lg text-foreground">{selectedAnnouncement.title}</h3>

              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{selectedAnnouncement.teacher_name}</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatDate(selectedAnnouncement.created_at)}</span>
                <span className="flex items-center gap-0.5 text-emerald-600"><Check className="h-3 w-3" />Read</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[45vh]">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </p>
            </div>

            {/* Footer */}
            <div className="p-3 border-t">
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full rounded-xl h-10 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900"
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
