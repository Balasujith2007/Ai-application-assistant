'use client';
import React from 'react';
import { User, Briefcase, Award, Bell, Lock, Bot, Database, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'career', label: 'Career Preferences', icon: Briefcase },
  { id: 'skills', label: 'Skills & Profile', icon: Award },
  { id: 'notifications', label: 'Notification Preferences', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Lock },
  { id: 'ai', label: 'AI Career Assistant', icon: Bot },
  { id: 'agent', label: 'Apply Agent Knowledge', icon: Sparkles },
  { id: 'data', label: 'Data & Account', icon: Database },
];

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: Props) {
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              isActive ? "bg-kit-50 text-kit-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive ? "text-kit-600" : "text-gray-400")} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
