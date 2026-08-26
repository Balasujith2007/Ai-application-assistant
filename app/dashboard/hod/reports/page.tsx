'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Loader2,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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

  // Cascading Filter States
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);

  const isClassSelected = Boolean(selectedDepartment && selectedYear && selectedSection);

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

  // Fetch departments on initial load
  const fetchDepartments = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch years when Department changes
  const handleDepartmentChange = async (dept: string) => {
    setSelectedDepartment(dept);
    setSelectedYear('');
    setSelectedSection('');
    setYears([]);
    setSections([]);

    if (!dept) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/hod/classes?department=${encodeURIComponent(dept)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setYears(res.data.years || []);
    } catch (err) {
      console.error('Failed to load years:', err);
    }
  };

  // Fetch sections when Year changes
  const handleYearChange = async (yr: string) => {
    setSelectedYear(yr);
    setSelectedSection('');
    setSections([]);

    if (!selectedDepartment || !yr) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `/api/hod/classes?department=${encodeURIComponent(selectedDepartment)}&year=${encodeURIComponent(yr)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSections(res.data.sections || []);
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const handleResetFilters = () => {
    setSelectedDepartment('');
    setSelectedYear('');
    setSelectedSection('');
    setYears([]);
    setSections([]);
    setErrorNotice(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (report: ReportConfig, format: 'pdf' | 'excel') => {
    if (!isClassSelected) {
      setErrorNotice('Please select Department, Year and Section to generate the report.');
      return;
    }

    setDownloadingId(report.id);
    setDownloadFormat(format);
    setErrorNotice(null);

    try {
      const token = localStorage.getItem('token');
      const endpointWithParams = `${report.endpoint}?department=${encodeURIComponent(
        selectedDepartment
      )}&year=${encodeURIComponent(selectedYear)}&section=${encodeURIComponent(selectedSection)}`;

      const res = await axios.get(endpointWithParams, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = res.data?.data || res.data || [];
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid report data format received from server.');
      }

      if (rawData.length === 0) {
        setErrorNotice(
          `No students/records found for the selected class (${selectedDepartment} - Year ${selectedYear} Section ${selectedSection}).`
        );
      }

      if (format === 'excel') {
        const XLSX = await import('xlsx');
        let excelRows: any[] = [];

        if (report.id === 'student-readiness') {
          excelRows = rawData.map((s: any) => ({
            'Student Name': s.name || '—',
            'Register No': s.registerNo || '—',
            'Department': s.department || selectedDepartment,
            'Year': s.year || selectedYear,
            'Section': s.section || selectedSection,
            'Assigned Mentor': s.assignedMentor?.name || 'Unassigned',
            'Resume Status': s.resumeStatus || 'Pending',
            'Applications Count': s.applicationsCount || 0,
          }));
        } else if (report.id === 'mentor-workload') {
          excelRows = rawData.map((m: any) => ({
            'Mentor Name': m.name || '—',
            'Email': m.email || '—',
            'Employee ID': m.employeeId || '—',
            'Department': m.department || selectedDepartment,
            'Assigned Students Count': m.assignedStudentsCount || 0,
            'Assigned Students': (m.assignedStudents || []).map((st: any) => st.name).join(', ') || 'None',
          }));
        } else if (report.id === 'application-placement') {
          excelRows = rawData.map((a: any) => ({
            'Student Name': a.user?.name || '—',
            'Register No': a.user?.profile?.registerNo || '—',
            'Department': a.user?.profile?.department || selectedDepartment,
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
            'Department': r.department || selectedDepartment,
            'Year': r.year || selectedYear,
            'Section': r.section || selectedSection,
            'Mentor Name': r.mentorName || 'Unassigned',
            'Resume Status': r.resumeStatus || 'Missing',
            'File Name': r.fileName || '—',
            'Uploaded Date': r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : '—',
          }));
        }

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

        const safeDept = selectedDepartment.replace(/[^a-zA-Z0-9]/g, '_');
        const safeTitle = report.title.replace(/\s+/g, '_');
        const filename = `${safeDept}_Year${selectedYear}_Section${selectedSection}_${safeTitle}.xlsx`;
        XLSX.writeFile(workbook, filename);
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

        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(`Department: ${selectedDepartment}`, 14, 25);
        doc.text(`Year: ${selectedYear}   |   Section: ${selectedSection}`, 14, 31);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`CareerAI Class Report | Generated: ${new Date().toLocaleDateString()}`, 14, 37);

        let pdfHead: string[][] = [];
        let pdfBody: any[][] = [];

        if (report.id === 'student-readiness') {
          pdfHead = [['Student Name', 'Register No', 'Department', 'Year', 'Section', 'Mentor', 'Resume Status', 'Apps']];
          pdfBody = rawData.map((s: any) => [
            s.name || '—',
            s.registerNo || '—',
            s.department || selectedDepartment,
            String(s.year || selectedYear),
            s.section || selectedSection,
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
            m.department || selectedDepartment,
            String(m.assignedStudentsCount || 0),
            (m.assignedStudents || []).map((st: any) => st.name).join(', ') || 'None',
          ]);
        } else if (report.id === 'application-placement') {
          pdfHead = [['Student Name', 'Register No', 'Department', 'Company', 'Position', 'Type', 'Status', 'Applied Date']];
          pdfBody = rawData.map((a: any) => [
            a.user?.name || '—',
            a.user?.profile?.registerNo || '—',
            a.user?.profile?.department || selectedDepartment,
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
            r.department || selectedDepartment,
            String(r.year || selectedYear),
            r.section || selectedSection,
            r.mentorName || 'Unassigned',
            r.resumeStatus || 'Missing',
            r.fileName || '—',
          ]);
        }

        autoTable(doc, {
          startY: 42,
          head: pdfHead,
          body: pdfBody,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
        });

        const safeDept = selectedDepartment.replace(/[^a-zA-Z0-9]/g, '_');
        const safeTitle = report.title.replace(/\s+/g, '_');
        const filename = `${safeDept}_Year${selectedYear}_Section${selectedSection}_${safeTitle}.pdf`;
        doc.save(filename);
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
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-kit-600" /> Department Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Exportable summaries for HOD management and placement audits</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kit-700 transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4" /> Print / Export Page
        </button>
      </motion.div>

      {/* Class Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-kit-600" /> Class Filter
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Select Department, Year, and Section to generate class-specific reports</p>
          </div>
          {(selectedDepartment || selectedYear || selectedSection) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors w-fit"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Department Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              disabled={loadingClasses}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              disabled={!selectedDepartment}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">Select Year</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Section Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              disabled={!selectedDepartment || !selectedYear}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">Select Section</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Class Banner */}
        {isClassSelected ? (
          <div className="rounded-xl bg-kit-50/70 border border-kit-100 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-kit-500 block mb-0.5">Selected Class</span>
              <p className="text-sm font-bold text-kit-900">{selectedDepartment}</p>
              <p className="text-xs text-kit-700 font-semibold mt-0.5">Year {selectedYear} • Section {selectedSection}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-kit-600 text-white shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Class Filter Active
            </span>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-center">
            <p className="text-xs font-semibold text-amber-800 flex items-center justify-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Please select Department, Year and Section to generate the report.
            </p>
          </div>
        )}
      </motion.div>

      {errorNotice && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex justify-between items-center">
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="text-gray-500 hover:text-gray-700">Dismiss</button>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {reports.map((r) => {
          const isThisDownloading = downloadingId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kit-50 text-kit-600">
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
                    disabled={!isClassSelected || isThisDownloading}
                    onClick={() => handleDownload(r, 'pdf')}
                    className="flex items-center gap-1.5 text-xs font-bold text-kit-600 hover:text-kit-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title={isClassSelected ? "Download as PDF" : "Select Department, Year and Section first"}
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
                    disabled={!isClassSelected || isThisDownloading}
                    onClick={() => handleDownload(r, 'excel')}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title={isClassSelected ? "Download as Excel (.xlsx)" : "Select Department, Year and Section first"}
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
