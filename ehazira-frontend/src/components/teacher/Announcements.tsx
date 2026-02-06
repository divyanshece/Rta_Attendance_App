import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementAPI, notesAPI, classAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Megaphone,
  StickyNote,
  Plus,
  X,
  Trash2,
  Check,
  Clock,
  Tag,
} from 'lucide-react'

type TabType = 'announcements' | 'notes'

interface Announcement {
  announcement_id: number
  class_id: number
  class_name: string
  subject_id: number | null
  subject_name: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}

interface Note {
  note_id: number
  class_id: number
  class_name: string
  subject_id: number | null
  subject_name: string | null
  content: string
  created_at: string
  updated_at: string
}

interface ClassInfo {
  class_id: number
  department_name: string
  batch: number
  semester: number
  section: string
  is_active: boolean
}

export default function TeacherAnnouncements() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('announcements')
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingTitle, setEditingTitle] = useState('')

  // Form state for new items
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newClassId, setNewClassId] = useState<number | null>(null)

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classAPI.list,
  })

  const activeClasses = (classes as ClassInfo[]).filter(c => c.is_active)

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements', selectedClass],
    queryFn: () => announcementAPI.list(selectedClass || undefined),
  })

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes', selectedClass],
    queryFn: () => notesAPI.list(selectedClass || undefined),
  })

  // Mutations for announcements
  const createAnnouncementMutation = useMutation({
    mutationFn: announcementAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      resetForm()
    },
  })

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; content?: string } }) =>
      announcementAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setEditingId(null)
    },
  })

  const deleteAnnouncementMutation = useMutation({
    mutationFn: announcementAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  // Mutations for notes
  const createNoteMutation = useMutation({
    mutationFn: notesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      resetForm()
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { content: string } }) =>
      notesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setEditingId(null)
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: notesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const resetForm = () => {
    setShowCreateModal(false)
    setNewTitle('')
    setNewContent('')
    setNewClassId(null)
  }

  const handleCreate = () => {
    if (!newClassId || !newContent.trim()) return

    if (activeTab === 'announcements') {
      if (!newTitle.trim()) return
      createAnnouncementMutation.mutate({
        class_id: newClassId,
        title: newTitle.trim(),
        content: newContent.trim(),
      })
    } else {
      createNoteMutation.mutate({
        class_id: newClassId,
        content: newContent.trim(),
      })
    }
  }

  const startEditing = (item: Announcement | Note) => {
    setEditingId('announcement_id' in item ? item.announcement_id : item.note_id)
    setEditingContent(item.content)
    if ('title' in item) {
      setEditingTitle(item.title)
    }
  }

  const saveEdit = () => {
    if (!editingId) return

    if (activeTab === 'announcements') {
      updateAnnouncementMutation.mutate({
        id: editingId,
        data: { title: editingTitle, content: editingContent },
      })
    } else {
      updateNoteMutation.mutate({
        id: editingId,
        data: { content: editingContent },
      })
    }
  }

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

  const isLoading = activeTab === 'announcements' ? announcementsLoading : notesLoading
  const items = activeTab === 'announcements' ? announcements : notes

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/teacher')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-foreground">Communications</h1>
                <p className="text-xs text-muted-foreground">Announcements & Notes</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'announcements'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-card border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Announcements
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'announcements' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {(announcements as Announcement[]).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-violet-500 text-white shadow-lg'
                : 'bg-card border text-muted-foreground hover:text-foreground'
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Private Notes
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'notes' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {(notes as Note[]).length}
            </span>
          </button>
        </div>

        {/* Class Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedClass(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedClass === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Classes
          </button>
          {activeClasses.map((cls) => (
            <button
              key={cls.class_id}
              onClick={() => setSelectedClass(cls.class_id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedClass === cls.class_id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
              }`}
            >
              {cls.department_name.substring(0, 3)} {cls.batch % 100} S{cls.semester} {cls.section}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card rounded-2xl border py-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              {activeTab === 'announcements' ? (
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              ) : (
                <StickyNote className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h4 className="font-heading font-semibold text-foreground mb-2">
              No {activeTab === 'announcements' ? 'announcements' : 'notes'} yet
            </h4>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === 'announcements'
                ? 'Create announcements to notify your students'
                : 'Add private notes for your reference'}
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create {activeTab === 'announcements' ? 'Announcement' : 'Note'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(items as (Announcement | Note)[]).map((item) => {
              const id = 'announcement_id' in item ? item.announcement_id : item.note_id
              const isEditing = editingId === id
              const isAnnouncement = 'title' in item

              return (
                <div
                  key={id}
                  className={`group bg-card rounded-2xl border p-4 transition-all ${
                    isEditing ? 'ring-2 ring-amber-500' : 'hover:shadow-lg'
                  }`}
                  onClick={() => !isEditing && startEditing(item)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        isAnnouncement
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      }`}>
                        <Tag className="h-3 w-3 inline mr-1" />
                        {item.class_name}
                      </div>
                      {item.subject_name && (
                        <span className="text-xs text-muted-foreground">
                          {item.subject_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              saveEdit()
                            }}
                            className="h-8 w-8 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setEditingId(null)
                            }}
                            className="h-8 w-8 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            if (isAnnouncement) {
                              deleteAnnouncementMutation.mutate(id)
                            } else {
                              deleteNoteMutation.mutate(id)
                            }
                          }}
                          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {isAnnouncement && (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder="Title"
                          className="font-semibold"
                          autoFocus
                        />
                      )}
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        placeholder="Content..."
                        rows={3}
                        autoFocus={!isAnnouncement}
                      />
                    </div>
                  ) : (
                    <>
                      {isAnnouncement && (
                        <h4 className="font-heading font-semibold text-foreground mb-2">
                          {(item as Announcement).title}
                        </h4>
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>
                    {item.updated_at !== item.created_at && (
                      <span className="text-xs text-muted-foreground">
                        (edited)
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeTab === 'announcements'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                }`}>
                  {activeTab === 'announcements' ? (
                    <Megaphone className="h-5 w-5 text-white" />
                  ) : (
                    <StickyNote className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground">
                    New {activeTab === 'announcements' ? 'Announcement' : 'Note'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'announcements' ? 'Visible to students' : 'Private to you'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                className="rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Class Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Select Class</label>
                <div className="flex flex-wrap gap-2">
                  {activeClasses.map((cls) => (
                    <button
                      key={cls.class_id}
                      onClick={() => setNewClassId(cls.class_id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        newClassId === cls.class_id
                          ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cls.department_name.substring(0, 3)} {cls.batch % 100} S{cls.semester} {cls.section}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title (Announcements only) */}
              {activeTab === 'announcements' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter announcement title..."
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {activeTab === 'announcements' ? 'Message' : 'Note'}
                </label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={activeTab === 'announcements' ? 'Write your announcement...' : 'Write your note...'}
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !newClassId ||
                  !newContent.trim() ||
                  (activeTab === 'announcements' && !newTitle.trim()) ||
                  createAnnouncementMutation.isPending ||
                  createNoteMutation.isPending
                }
                className={`rounded-xl ${
                  activeTab === 'announcements'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-violet-500 hover:bg-violet-600 text-white'
                }`}
              >
                {(createAnnouncementMutation.isPending || createNoteMutation.isPending) ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
