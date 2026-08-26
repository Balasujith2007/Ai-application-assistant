'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  FileText,
  Save,
  Send,
  Eye,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  ChevronDownSquare,
  CircleDot,
  CheckSquare,
  UploadCloud,
  Link2,
  Star,
  CheckCircle2,
  UserCheck,
  Heading,
  FileCode,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import axios from 'axios';
import { FormRenderer } from '@/components/forms/FormRenderer';

interface FormFieldItem {
  id?: string;
  fieldId: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  order: number;
  config: {
    options?: string[];
    min?: number;
    max?: number;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    profileKey?: string;
    isReadOnly?: boolean;
  };
}

const FIELD_PALETTE = [
  { type: 'short-text', label: 'Short Text', icon: Type, category: 'Text & Input' },
  { type: 'long-text', label: 'Long Text / Textarea', icon: AlignLeft, category: 'Text & Input' },
  { type: 'email', label: 'Email Address', icon: Mail, category: 'Text & Input' },
  { type: 'phone', label: 'Phone Number', icon: Phone, category: 'Text & Input' },
  { type: 'number', label: 'Number', icon: Hash, category: 'Text & Input' },
  { type: 'date', label: 'Date', icon: Calendar, category: 'Text & Input' },
  { type: 'url', label: 'Website / URL', icon: Link2, category: 'Text & Input' },
  { type: 'dropdown', label: 'Dropdown Select', icon: ChevronDownSquare, category: 'Choices' },
  { type: 'radio', label: 'Radio Buttons', icon: CircleDot, category: 'Choices' },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, category: 'Choices' },
  { type: 'yesno', label: 'Yes / No', icon: CheckCircle2, category: 'Choices' },
  { type: 'rating', label: 'Rating (1-5 Stars)', icon: Star, category: 'Choices' },
  { type: 'file', label: 'File Upload', icon: UploadCloud, category: 'Media' },
  { type: 'section', label: 'Section Header', icon: Heading, category: 'Layout' },
  { type: 'paragraph', label: 'Paragraph Text', icon: FileCode, category: 'Layout' },
  { type: 'profile-field', label: 'Student Profile Field', icon: UserCheck, category: 'CareerAI Profile' },
];

const PROFILE_KEYS = [
  { key: 'fullName', label: 'Student Name' },
  { key: 'email', label: 'Student Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'college', label: 'College Name' },
  { key: 'department', label: 'Department' },
  { key: 'year', label: 'Year of Study' },
  { key: 'section', label: 'Section' },
  { key: 'registrationNumber', label: 'Register Number' },
  { key: 'githubUrl', label: 'GitHub Profile URL' },
  { key: 'linkedinUrl', label: 'LinkedIn Profile URL' },
  { key: 'codolioUrl', label: 'Codolio Profile URL' },
];

export default function FormBuilderEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id as string;
  const initialPreviewMode = searchParams.get('preview') === 'true';

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formInst, setFormInst] = useState<string>('');
  const [allowMultiple, setAllowMultiple] = useState<boolean>(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string>('Your response has been submitted successfully.');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CLOSED'>('DRAFT');

  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(initialPreviewMode);

  // Auto-save debounce timer
  const isInitialLoad = useRef<boolean>(true);

  const fetchFormDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/hod/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      if (data) {
        setFormTitle(data.title || 'Untitled Form');
        setFormDesc(data.description || '');
        setFormInst(data.instructions || '');
        setAllowMultiple(Boolean(data.allowMultipleSubmissions));
        setConfirmationMsg(data.confirmationMessage || 'Your response has been submitted successfully.');
        setFormStatus(data.status || 'DRAFT');

        const loadedFields: FormFieldItem[] = (data.fields || []).map((f: any) => ({
          id: f.id,
          fieldId: f.fieldId || `field_${Math.random().toString(36).substr(2, 9)}`,
          type: f.type || 'short-text',
          label: f.label || 'Untitled Field',
          description: f.description || '',
          placeholder: f.placeholder || '',
          required: Boolean(f.required),
          order: f.order || 0,
          config: f.config || {},
        }));
        setFields(loadedFields);
        if (loadedFields.length > 0) {
          setSelectedFieldId(loadedFields[0].fieldId);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch form details:', err);
      alert('Could not load form for editing.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    }
  }, [formId]);

  useEffect(() => {
    fetchFormDetails();
  }, [fetchFormDetails]);

  // Save Draft to Server
  const saveFormDraft = async (silent = false) => {
    if (!silent) setSaving(true);
    setSaveStatus('saving');
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/hod/forms/${formId}`,
        {
          title: formTitle,
          description: formDesc,
          instructions: formInst,
          allowMultipleSubmissions: allowMultiple,
          confirmationMessage: confirmationMsg,
          fields: fields.map((f, index) => ({
            fieldId: f.fieldId,
            type: f.type,
            label: f.label,
            description: f.description,
            placeholder: f.placeholder,
            required: f.required,
            order: index,
            config: f.config,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      setSaveStatus('unsaved');
      if (!silent) alert('Failed to save form draft.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleAddField = (type: string, presetConfig: any = {}) => {
    const newFieldId = `field_${Math.random().toString(36).substr(2, 9)}`;
    let defaultLabel = 'Untitled Question';
    let defaultOptions = ['Option 1', 'Option 2'];

    if (type === 'profile-field') {
      defaultLabel = 'Student Profile Field';
      presetConfig.profileKey = presetConfig.profileKey || 'fullName';
      presetConfig.isReadOnly = true;
    } else if (type === 'dropdown' || type === 'radio' || type === 'checkbox') {
      presetConfig.options = defaultOptions;
    }

    const item = FIELD_PALETTE.find((p) => p.type === type);
    if (item && type !== 'profile-field') {
      defaultLabel = item.label;
    }

    const newField: FormFieldItem = {
      fieldId: newFieldId,
      type,
      label: defaultLabel,
      description: '',
      placeholder: '',
      required: false,
      order: fields.length,
      config: presetConfig,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newFieldId);
    setSaveStatus('unsaved');
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
    setSaveStatus('unsaved');
  };

  const handleDuplicateField = (field: FormFieldItem) => {
    const newFieldId = `field_${Math.random().toString(36).substr(2, 9)}`;
    const copy: FormFieldItem = {
      ...field,
      fieldId: newFieldId,
      label: `${field.label} (Copy)`,
      config: JSON.parse(JSON.stringify(field.config || {})),
    };
    setFields((prev) => [...prev, copy]);
    setSelectedFieldId(newFieldId);
    setSaveStatus('unsaved');
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.fieldId !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setSaveStatus('unsaved');
  };

  const handleUpdateSelectedField = (key: string, value: any) => {
    if (!selectedFieldId) return;
    setFields((prev) =>
      prev.map((f) => {
        if (f.fieldId === selectedFieldId) {
          return { ...f, [key]: value };
        }
        return f;
      })
    );
    setSaveStatus('unsaved');
  };

  const handleUpdateFieldConfig = (configKey: string, value: any) => {
    if (!selectedFieldId) return;
    setFields((prev) =>
      prev.map((f) => {
        if (f.fieldId === selectedFieldId) {
          return {
            ...f,
            config: { ...(f.config || {}), [configKey]: value },
          };
        }
        return f;
      })
    );
    setSaveStatus('unsaved');
  };

  const handlePublishForm = async () => {
    await saveFormDraft(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/hod/forms/${formId}/publish`,
        { action: 'publish' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormStatus('PUBLISHED');
      alert('Form published successfully!');
      router.push('/dashboard/hod/forms');
    } catch (err: any) {
      console.error('Publish error:', err);
      const msg = err.response?.data?.message || err.response?.data?.errors?.join('\n') || 'Validation failed. Cannot publish.';
      alert(msg);
    }
  };

  const selectedField = fields.find((f) => f.fieldId === selectedFieldId);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-kit-600" />
        <p className="text-xs font-semibold mt-2">Loading Form Builder…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/hod/forms')}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Back to Forms"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  setSaveStatus('unsaved');
                }}
                className="text-lg font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-kit-500 focus:outline-none px-1 py-0.5"
                placeholder="Form Title"
              />
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  formStatus === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {formStatus}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span>{fields.length} Questions</span>
              <span>•</span>
              <span className={saveStatus === 'unsaved' ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                {saveStatus === 'saving' ? 'Saving draft…' : saveStatus === 'unsaved' ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => saveFormDraft(false)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-kit-600 hover:bg-kit-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Draft</span>
          </button>
          <button
            onClick={handlePublishForm}
            className="flex items-center gap-1.5 rounded-xl bg-kit-600 px-4 py-2 text-xs font-semibold text-white hover:bg-kit-700 transition-colors shadow-sm"
          >
            <Send className="h-3.5 w-3.5" /> Publish Form
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Field Toolbox */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto sticky top-20">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Field Toolbox</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Click to add fields to canvas</p>
          </div>

          <div className="space-y-4">
            {['Text & Input', 'Choices', 'CareerAI Profile', 'Media', 'Layout'].map((cat) => {
              const catFields = FIELD_PALETTE.filter((f) => f.category === cat);
              return (
                <div key={cat} className="space-y-1.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-kit-600">{cat}</h3>
                  <div className="space-y-1">
                    {catFields.map((f) => (
                      <button
                        key={f.type}
                        onClick={() => handleAddField(f.type)}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-kit-50 hover:border-kit-200 hover:text-kit-700 transition-all text-left group"
                      >
                        <f.icon className="h-4 w-4 text-gray-400 group-hover:text-kit-600 shrink-0" />
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Form Canvas */}
        <div className="lg:col-span-6 space-y-4 min-h-[500px]">
          {/* Form Header Card */}
          <div
            onClick={() => setShowSettingsModal(true)}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm cursor-pointer hover:border-kit-300 transition-colors group relative"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-kit-600 block mb-1">Click to edit header & instructions</span>
            <h1 className="text-xl font-bold text-gray-900">{formTitle || 'Untitled Form'}</h1>
            {formDesc && <p className="text-xs text-gray-500 mt-1">{formDesc}</p>}
            {formInst && (
              <div className="mt-3 rounded-xl bg-kit-50/70 p-3 text-xs text-kit-900 border border-kit-100">
                <strong>Instructions:</strong> {formInst}
              </div>
            )}
          </div>

          {/* Fields List */}
          {fields.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center space-y-2">
              <Plus className="h-8 w-8 text-gray-400 mx-auto" />
              <h3 className="text-sm font-bold text-gray-700">Canvas is Empty</h3>
              <p className="text-xs text-gray-500">Click any field from the Left Toolbox to add questions to your form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isSelected = selectedFieldId === field.fieldId;
                return (
                  <motion.div
                    key={field.fieldId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedFieldId(field.fieldId)}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all relative cursor-pointer group ${
                      isSelected
                        ? 'border-kit-600 ring-2 ring-kit-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-gray-500 cursor-grab shrink-0" />
                        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {field.label}
                          {field.required && <span className="text-rose-600 ml-1">*</span>}
                        </h4>
                      </div>

                      {/* Field Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveField(index, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveField(index, 'down');
                          }}
                          disabled={index === fields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateField(field);
                          }}
                          className="p-1 text-gray-400 hover:text-kit-600"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.fieldId);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {field.description && <p className="text-xs text-gray-500 mt-1 ml-6">{field.description}</p>}

                    {/* Field Visual Placeholder */}
                    <div className="mt-3 ml-6 pt-2 border-t border-gray-100 text-xs text-gray-400 italic">
                      Type: <span className="font-semibold text-kit-600 not-italic uppercase tracking-wider text-[10px]">{field.type}</span>
                      {['dropdown', 'radio', 'checkbox'].includes(field.type) && field.config.options && (
                        <div className="mt-1 flex flex-wrap gap-1 not-italic font-normal">
                          {field.config.options.map((opt, i) => (
                            <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[11px]">{opt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Properties Panel */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto sticky top-20">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Field Properties</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Configure selected question</p>
          </div>

          {selectedField ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Field Label</label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => handleUpdateSelectedField('label', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Subtitle</label>
                <textarea
                  rows={2}
                  value={selectedField.description || ''}
                  onChange={(e) => handleUpdateSelectedField('description', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                  placeholder="Optional hint for students"
                />
              </div>

              {['short-text', 'long-text', 'email', 'phone', 'number', 'url'].includes(selectedField.type) && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => handleUpdateSelectedField('placeholder', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                    placeholder="Input placeholder text"
                  />
                </div>
              )}

              {/* Required Toggle */}
              {selectedField.type !== 'section' && selectedField.type !== 'paragraph' && (
                <div className="flex items-center justify-between border-t border-b border-gray-100 py-3">
                  <span className="text-xs font-bold text-gray-900">Required Question</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => handleUpdateSelectedField('required', e.target.checked)}
                    className="h-4 w-4 rounded-sm text-kit-600 focus:ring-kit-500 border-gray-300"
                  />
                </div>
              )}

              {/* Options Builder for Dropdown/Radio/Checkbox */}
              {['dropdown', 'radio', 'checkbox'].includes(selectedField.type) && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <label className="block text-xs font-bold text-gray-700">Options</label>
                  {(selectedField.config.options || []).map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOpts = [...(selectedField.config.options || [])];
                          newOpts[optIdx] = e.target.value;
                          handleUpdateFieldConfig('options', newOpts);
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-kit-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const newOpts = [...(selectedField.config.options || [])];
                          newOpts.splice(optIdx, 1);
                          handleUpdateFieldConfig('options', newOpts);
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOpts = [...(selectedField.config.options || []), `Option ${(selectedField.config.options || []).length + 1}`];
                      handleUpdateFieldConfig('options', newOpts);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-kit-600 hover:text-kit-700 pt-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </button>
                </div>
              )}

              {/* Student Profile Field Selector */}
              {selectedField.type === 'profile-field' && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CareerAI Profile Source</label>
                    <select
                      value={selectedField.config.profileKey || 'fullName'}
                      onChange={(e) => {
                        const selectedObj = PROFILE_KEYS.find((pk) => pk.key === e.target.value);
                        handleUpdateFieldConfig('profileKey', e.target.value);
                        if (selectedObj) {
                          handleUpdateSelectedField('label', selectedObj.label);
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                    >
                      {PROFILE_KEYS.map((pk) => (
                        <option key={pk.key} value={pk.key}>{pk.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Read-only Field</span>
                    <input
                      type="checkbox"
                      checked={selectedField.config.isReadOnly !== false}
                      onChange={(e) => handleUpdateFieldConfig('isReadOnly', e.target.checked)}
                      className="h-4 w-4 rounded-sm text-kit-600 focus:ring-kit-500 border-gray-300"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic py-4">Click a question on the center canvas to configure its label, options, and rules.</p>
          )}
        </div>
      </div>

      {/* Form Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-kit-600" /> Form Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Form Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Instructions for Students</label>
                <textarea
                  rows={2}
                  value={formInst}
                  onChange={(e) => setFormInst(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Allow Multiple Submissions</span>
                  <span className="text-[11px] text-gray-500">Allow a student to submit more than once</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="h-4 w-4 rounded-sm text-kit-600 focus:ring-kit-500 border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmation Message</label>
                <input
                  type="text"
                  value={confirmationMsg}
                  onChange={(e) => setConfirmationMsg(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl bg-kit-600 px-4 py-2 text-xs font-semibold text-white hover:bg-kit-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Preview Mode
                </span>
                <span className="text-xs text-gray-500">How students will see this form</span>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <FormRenderer
              form={{
                id: formId,
                title: formTitle,
                description: formDesc,
                instructions: formInst,
                status: formStatus,
                allowMultipleSubmissions: allowMultiple,
                confirmationMessage: confirmationMsg,
                fields,
              }}
              mode="preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
