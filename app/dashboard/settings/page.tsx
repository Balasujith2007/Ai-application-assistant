'use client';

import React, { useState, useEffect } from 'react';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { CareerPreferences } from '@/components/settings/CareerPreferences';
import { SkillsSettings } from '@/components/settings/SkillsSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { AIPreferences } from '@/components/settings/AIPreferences';
import { DataSettings } from '@/components/settings/DataSettings';
import { AgentKnowledge } from '@/components/settings/AgentKnowledge';
import api from '@/lib/api';

export default function DashboardSettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [userSettings, setUserSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setUserSettings(res.data.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (data: any) => {
    try {
      const res = await api.put('/settings', data);
      setUserSettings(res.data.data);
      alert('Settings updated successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to update settings.');
    }
  };

  const renderContent = () => {
    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    if (!userSettings) return <div className="p-8 text-center text-red-500">Failed to load settings.</div>;

    switch (activeTab) {
      case 'account': return <AccountSettings data={userSettings} onSave={handleSave} />;
      case 'career': return <CareerPreferences data={userSettings} onSave={handleSave} />;
      case 'skills': return <SkillsSettings data={userSettings} onSave={handleSave} />;
      case 'notifications': return <NotificationSettings data={userSettings} onSave={handleSave} />;
      case 'privacy': return <PrivacySettings data={userSettings} onSave={handleSave} />;
      case 'ai': return <AIPreferences data={userSettings} onSave={handleSave} />;
      case 'agent': return <AgentKnowledge />;
      case 'data': return <DataSettings data={userSettings} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings & Preferences</h1>
        <p className="mt-1 text-gray-500">Manage your profile, security settings, AI preferences, and notification defaults</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
