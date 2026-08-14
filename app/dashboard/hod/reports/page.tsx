'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ReportConfig {
  id: string;
  title: string;
  desc: string;
  date: string;
  endpoint: string;
}

export default function HODReportsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'excel' | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const reports: ReportConfig[] = [
    {
      id: 'student-readiness',
      title: 'Student Career Readiness Report',
      desc: 'Complete breakdown of student resume readiness, applications, and progress scores.',
      date: 'August 2026',
      endpoint: '/api/hod/students',
    },
    {
      id: 'mentor-workload',
      title: 'Mentor Workload & Assignment Report',
      desc: 'Faculty mentor allocation, student counts, and active review tasks.',
      date: 'August 2026',
      endpoint: '/api/hod/mentors',
    },
    {
      id: 'application-placement',
      title: 'Department Application & Placement Report',
      desc: 'Applications submitted, interview status distributions, and offer statistics.',
      date: 'August 2026',
      endpoint: '/api/hod/applications',
    },
    {
      id: 'resume-audit',
      title: 'Resume Audit Summary Report',
      desc: 'Review statuses of all department student uploaded resumes.',
      date: 'August 2026',
      endpoint: '/api/hod/resumes',
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (report: ReportConfig, format: 'pdf' | 'excel') => {
    setDownloadingId(report.id);
    setDownloadFormat(format);
    setErrorNotice(null);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(report.endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = res.data?.data || res.data || [];
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid report data format received from server.');
      }

      if (format === 'excel') {
        const XLSX = await import('xlsx');
        let excelRows: any[] = [];

        if (report.id === 'student-readiness') {
          excelRows = rawData.map((s: any) => ({
            'Student Name': s.name || '—',
            'Register No': s.registerNo || '—',
            'Department': s.department || '—',
            'Year': s.year || '—',
            'Section': s.section || '—',
            'Assigned Mentor': s.assignedMentor?.name || 'Unassigned',
            'Resume Status': s.resumeStatus || 'Pending',
            'Applications Count': s.applicationsCount || 0,
          }));
        } else if (report.id === 'mentor-workload') {
          excelRows = rawData.map((m: any) => ({
            'Mentor Name': m.name || '—',
            'Email': m.email || '—',
            'Employee ID': m.employeeId || '—',
            'Department': m.department || '—',
            'Assigned Students Count': m.assignedStudentsCount || 0,
            'Assigned Students': (m.assignedStudents || []).map((st: any) => st.name).join(', ') || 'None',
          }));
        } else if (report.id === 'application-placement') {
          excelRows = rawData.map((a: any) => ({
            'Student Name': a.user?.name || '—',
            'Register No': a.user?.profile?.registerNo || '—',
            'Department': a.user?.profile?.department || '—',
            'Company Name': a.companyName || '—',
            'Position': a.position || '—',
            'Application Type': a.applicationType || '—',
            'Status': a.status || '—',
            'Applied Date': a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : '—',
          }));
        } else if (report.id === 'resume-audit') {
          excelRows = rawData.map((r: any) => ({
            'Student Name': r.studentName || '—',
            'Register No': r.registerNo || '—',
            'Department': r.department || '—',
            'Year': r.year || '—',
            'Section': r.section || '—',
            'Mentor Name': r.mentorName || 'Unassigned',
            'Resume Status': r.resumeStatus || 'Missing',
            'File Name': r.fileName || '—',
            'Uploaded Date': r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : '—',
          }));
        }

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${report.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      } else {
        // PDF Export
        const jsPDFModule = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const jsPDF = jsPDFModule.default || jsPDFModule;
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(report.title, 14, 18);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`CareerAI Department Report | Generated: ${new Date().toLocaleDateString()}`, 14, 25);

        let pdfHead: string[][] = [];
        let pdfBody: any[][] = [];

        if (report.id === 'student-readiness') {
          pdfHead = [['Student Name', 'Register No', 'Department', 'Year', 'Section', 'Mentor', 'Resume Status', 'Apps']];
          pdfBody = rawData.map((s: any) => [
            s.name || '—',
            s.registerNo || '—',
            s.department || '—',
            String(s.year || '—'),
            s.section || '—',
            s.assignedMentor?.name || 'Unassigned',
            s.resumeStatus || 'Pending',
            String(s.applicationsCount || 0),
          ]);
        } else if (report.id === 'mentor-workload') {
          pdfHead = [['Mentor Name', 'Email', 'Employee ID', 'Department', 'Students Count', 'Assigned Students']];
          pdfBody = rawData.map((m: any) => [
            m.name || '—',
            m.email || '—',
            m.employeeId || '—',
            m.department || '—',
            String(m.assignedStudentsCount || 0),
            (m.assignedStudents || []).map((st: any) => st.name).join(', ') || 'None',
          ]);
        } else if (report.id === 'application-placement') {
          pdfHead = [['Student Name', 'Register No', 'Department', 'Company', 'Position', 'Type', 'Status', 'Applied Date']];
          pdfBody = rawData.map((a: any) => [
            a.user?.name || '—',
            a.user?.profile?.registerNo || '—',
            a.user?.profile?.department || '—',
            a.companyName || '—',
            a.position || '—',
            a.applicationType || '—',
            a.status || '—',
            a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : '—',
          ]);
        } else if (report.id === 'resume-audit') {
          pdfHead = [['Student Name', 'Register No', 'Department', 'Year', 'Section', 'Mentor', 'Resume Status', 'File Name']];
          pdfBody = rawData.map((r: any) => [
            r.studentName || '—',
            r.registerNo || '—',
            r.department || '—',
            String(r.year || '—'),
            r.section || '—',
            r.mentorName || 'Unassigned',
            r.resumeStatus || 'Missing',
            r.fileName || '—',
          ]);
        }

        autoTable(doc, {
          startY: 30,
          head: pdfHead,
          body: pdfBody,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
        });

        doc.save(`${report.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      }
    } catch (err: any) {
      console.error(`Failed to download report:`, err);
      setErrorNotice(err?.message || 'Failed to download report data.');
    } finally {
      setDownloadingId(null);
      setDownloadFormat(null);
    }
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
          <Printer className="h-4 w-4" /> Print / Export Page
        </button>
      </motion.div>

      {errorNotice && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex justify-between items-center">
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="text-gray-500 hover:text-gray-700">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {reports.map((r) => {
          const isThisDownloading = downloadingId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
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
                <div className="flex items-center gap-3">
                  <button
                    disabled={isThisDownloading}
                    onClick={() => handleDownload(r, 'pdf')}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                    title="Download as PDF"
                  >
                    {isThisDownloading && downloadFormat === 'pdf' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Download PDF</span>
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    disabled={isThisDownloading}
                    onClick={() => handleDownload(r, 'excel')}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                    title="Download as Excel (.xlsx)"
                  >
                    {isThisDownloading && downloadFormat === 'excel' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    )}
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
