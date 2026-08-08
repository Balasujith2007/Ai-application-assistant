'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Printer, CheckCircle2 } from 'lucide-react';

export default function HODReportsPage() {
  const reports = [
    { title: 'Student Career Readiness Report', desc: 'Complete breakdown of student resume readiness, applications, and progress scores.', date: 'August 2026' },
    { title: 'Mentor Workload & Assignment Report', desc: 'Faculty mentor allocation, student counts, and active review tasks.', date: 'August 2026' },
    { title: 'Department Application & Placement Report', desc: 'Applications submitted, interview status distributions, and offer statistics.', date: 'August 2026' },
    { title: 'Resume Audit Summary Report', desc: 'Review statuses of all department student uploaded resumes.', date: 'August 2026' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Department Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Exportable summaries for HOD management and placement audits</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4" /> Print / Export PDF
        </button>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {reports.map((r, idx) => (
          <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900">{r.title}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs text-gray-400 font-medium">Generated: {r.date}</span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Download className="h-3.5 w-3.5" /> Download Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
