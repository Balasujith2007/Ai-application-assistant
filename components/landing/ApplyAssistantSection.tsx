'use client';

import { Zap, Check, ShieldCheck, Lock } from 'lucide-react';

const WORKFLOW_NODES = [
  { step: '01', title: 'Student Profile', desc: 'Saved profile data' },
  { step: '02', title: 'AI Field Detection', desc: 'Identifies form fields' },
  { step: '03', title: 'Smart Information Mapping', desc: 'Pre-fills supported inputs' },
  { step: '04', title: 'Student Review', desc: 'Review & verify details' },
  { step: '05', title: 'Final Submission by Student', desc: 'Manual student submission', highlight: true },
];

const CAPABILITIES = [
  'Detects supported application fields',
  'Maps available student information',
  'Reuses saved answers where appropriate',
  'Supports resume attachment where technically supported',
];

const SAFETY_RULES = [
  'CAPTCHA requires student action',
  'Sensitive questions remain under student control',
  'Legal declarations are not automatically accepted',
  'Final submission remains with the student',
];

export default function ApplyAssistantSection() {
  return (
    <section id="apply-assistant" className="py-24 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-kit-200 bg-kit-50 px-4 py-1.5 text-xs font-semibold text-kit-700 mb-4">
            <Zap className="h-3.5 w-3.5" />
            <span>AI Apply Assistant Showcase</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Apply Smarter. Stay in Control.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Intelligent form field detection and profile mapping built with responsible design, transparency, and complete student oversight.
          </p>
        </div>

        {/* Visual Workflow Diagram */}
        <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
          <p className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-6 text-center">
            Visual Workflow:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative items-center">
            {WORKFLOW_NODES.map((node) => (
              <div key={node.step} className="flex flex-col items-center">
                <div
                  className={`w-full p-4 rounded-xl border text-center transition-all ${
                    node.highlight
                      ? 'bg-kit-600 border-kit-600 text-white shadow-md shadow-kit-600/20'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold uppercase mb-1 block ${
                      node.highlight ? 'text-kit-100' : 'text-kit-600'
                    }`}
                  >
                    STEP {node.step}
                  </span>
                  <h4 className="text-sm font-bold">{node.title}</h4>
                  <p
                    className={`text-[11px] mt-1 ${
                      node.highlight ? 'text-kit-50' : 'text-slate-500'
                    }`}
                  >
                    {node.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column Capability vs Safety Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Core Capabilities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kit-50 text-kit-600 border border-kit-100">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Powerful AI Capabilities</h3>
                <p className="text-xs text-slate-500">Fast, streamlined data mapping</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Safety & Student Control */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Responsible Safety Design</h3>
                <p className="text-xs text-slate-500">Zero unauthorized actions or bypasses</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {SAFETY_RULES.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    <Lock className="h-3 w-3 stroke-[2.5]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
