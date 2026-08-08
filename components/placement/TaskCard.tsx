'use client';

import React from 'react';
import { Check, Clock, AlertCircle, Calendar, Trash2, Pencil, Tag } from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '@/types/placement';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const priorityStyles: Record<TaskPriority, { badge: string; dot: string }> = {
    High: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
    Medium: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    Low: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    },
  };

  const categoryStyles: Record<TaskCategory, string> = {
    Resume: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Applications: 'bg-blue-50 text-blue-700 border-blue-200',
    Interviews: 'bg-purple-50 text-purple-700 border-purple-200',
    'Skill Development': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Hackathons: 'bg-orange-50 text-orange-700 border-orange-200',
    Mentor: 'bg-teal-50 text-teal-700 border-teal-200',
    Documents: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const pStyle = priorityStyles[task.priority] || priorityStyles.Medium;
  const cStyle = categoryStyles[task.category] || 'bg-gray-50 text-gray-700 border-gray-200';

  const isToday = task.dueDate === 'Today' || task.dueDate === '2026-08-08';
  const isOverdue = !task.completed && !isToday && new Date(task.dueDate) < new Date('2026-08-08');

  return (
    <div
      className={cn(
        'group flex items-start justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        task.completed ? 'border-gray-200 bg-gray-50/50 opacity-75' : 'border-gray-200 hover:border-gray-300',
      )}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
            task.completed
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-gray-300 bg-white hover:border-indigo-500',
          )}
        >
          {task.completed && <Check className="h-4 w-4 stroke-[3]" />}
        </button>

        {/* Task Details */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn(
                'font-bold text-gray-900 text-base leading-snug',
                task.completed && 'line-through text-gray-400',
              )}
            >
              {task.title}
            </h4>

            {/* Priority Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold',
                pStyle.badge,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', pStyle.dot)} />
              {task.priority}
            </span>

            {/* Category Badge */}
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                cStyle,
              )}
            >
              {task.category}
            </span>
          </div>

          {task.description && (
            <p className={cn('text-xs text-gray-500 leading-relaxed', task.completed && 'text-gray-400')}>
              {task.description}
            </p>
          )}

          {/* Due date & Reminder metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 pt-1">
            <span
              className={cn(
                'flex items-center gap-1.5',
                isOverdue ? 'text-rose-600 font-bold' : isToday ? 'text-indigo-600 font-bold' : 'text-gray-500',
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Due: {task.dueDate}
              {isOverdue && ' (Overdue)'}
            </span>

            {task.reminder && (
              <span className="flex items-center gap-1 text-gray-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {task.reminder}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
          title="Edit Task"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete task "${task.title}"?`)) onDelete(task.id);
          }}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-rose-500 transition-colors"
          title="Delete Task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
