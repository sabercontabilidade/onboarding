import { useState } from 'react'
import { List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ViewType = 'list' | 'kanban'

interface ViewToggleProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  className?: string
}

export function ViewToggle({ currentView, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`} role="group">
      <Button
        variant={currentView === 'list' ? 'default' : 'outline'}
        onClick={() => onViewChange('list')}
        className="rounded-r-none"
        data-testid="view-toggle-list"
      >
        <List className="h-4 w-4 mr-2" />
        Lista
      </Button>
      <Button
        variant={currentView === 'kanban' ? 'default' : 'outline'}
        onClick={() => onViewChange('kanban')}
        className="rounded-l-none border-l-0"
        data-testid="view-toggle-kanban"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Kanban
      </Button>
    </div>
  )
}