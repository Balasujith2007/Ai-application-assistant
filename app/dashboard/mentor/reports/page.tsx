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
  Users,
  Briefcase,
  Trophy,
  AlertCircle,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import axios from 'axios';

interface ReportConfig {
  id: 'assigned-career' | 'internship-hackathon' | 'application-placement' | 'resume-readiness';
  title: string;
  desc: string;
  date: string;
}

interface SummaryMetrics {
  assignedStudentsCount: number;
  internshipRegistrationsCount: number;
  hackathonRegistrationsCount: number;
  studentsWithResume: number;
  studentsWithoutResume: number;
  studentsNeedingAttention: number;
}

interface MentorInfo {
  id: string;
  name: string;
  email: string;
}

export default function MentorReportsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'excel' | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Summary Metrics & Mentor Info
  const [summary, setSummary] = useState<SummaryMetrics>({
    assignedStudentsCount: 0,
    internshipRegistrationsCount: 0,
    hackathonRegistrationsCount: 0,
    studentsWithResume: 0,
    studentsWithoutResume: 0,
    studentsNeedingAttention: 0,
  });
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);

  // Remaining Filter States (Year and Section removed)
  const [selectedReportType, setSelectedReportType] = useState<string>('ALL');
  const [selectedOpportunityType, setSelectedOpportunityType] = useState<string>('ALL');
  const [selectedRegStatus, setSelectedRegStatus] = useState<string>('ALL');
  const [selectedResumeStatus, setSelectedResumeStatus] = useState<string>('ALL');

  const reports: ReportConfig[] = [
    {
      id: 'assigned-career',
      title: 'Assigned Student Career Report',
      desc: 'Complete overview of assigned students, profile readiness, resume status, skills, applications and progress.',
      date: 'August 2026',
    },
    {
      id: 'internship-hackathon',
      title: 'Internship & Hackathon Report',
      desc: 'Track internship and hackathon registrations completed by your assigned students.',
      date: 'August 2026',
    },
    {
      id: 'application-placement',
      title: 'Student Application & Placement Report',
      desc: 'Monitor company applications, interview stages, and placement/offer statuses.',
      date: 'August 2026',
    },
    {
      id: 'resume-readiness',
      title: 'Resume & Student Readiness Report',
      desc: 'Audit uploaded resumes, review statuses, career readiness scores, and mentor feedback.',
      date: 'August 2026',
    },
  ];

  // Fetch initial summary metrics from server
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/mentor/reports?reportType=assigned-career', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
      if (res.data.mentorInfo) {
        setMentorInfo(res.data.mentorInfo);
      }
    } catch (err: any) {
      console.error('Failed to load mentor report metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleResetFilters = () => {
    setSelectedReportType('ALL');
    setSelectedOpportunityType('ALL');
    setSelectedRegStatus('ALL');
    setSelectedResumeStatus('ALL');
    setErrorNotice(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (report: ReportConfig, format: 'pdf' | 'excel') => {
    if (downloadingId) return; // Prevent double click

    setDownloadingId(report.id);
    setDownloadFormat(format);
    setErrorNotice(null);

    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        reportType: report.id,
        opportunityType: selectedOpportunityType,
        registrationStatus: selectedRegStatus,
        resumeStatus: selectedResumeStatus,
      });

      const res = await axios.get(`/api/mentor/reports?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = res.data?.data || [];
      const currentMentor = res.data?.mentorInfo || mentorInfo;

      if (!Array.isArray(rawData)) {
        throw new Error('Invalid report data format received from server.');
      }

      if (rawData.length === 0) {
        setErrorNotice(
          `No data found for the selected filters in "${report.title}".`
        );
        return;
      }

      const currentDateStr = new Date().toISOString().slice(0, 10);
      const generatedDateText = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (format === 'excel') {
        const XLSX = await import('xlsx');
        let excelRows: any[] = [];
        let sheetName = 'Mentor Report';

        if (report.id === 'assigned-career') {
          sheetName = 'Student Career Report';
          excelRows = rawData.map((s: any) => ({
            'Student Name': s.name || 'N/A',
            'Register Number': s.registerNo || 'N/A',
            'Email': s.email || 'N/A',
            'Department': s.department || 'N/A',
            'Year': s.year || 'N/A',
            'Section': s.section || 'N/A',
            'CGPA': s.cgpa || 'N/A',
            'Profile Readiness': s.profileCompletion || '0%',
            'Resume Uploaded': s.resumeUploaded || 'No',
            'Resume Status': s.resumeStatus || 'Not Uploaded',
            'Skills': s.skills || 'None',
            'Application Count': s.applicationsCount || 0,
            'Registrations Count': s.registrationsCount || 0,
            'Internship Registrations': s.internshipRegistrations || 0,
            'Hackathon Registrations': s.hackathonRegistrations || 0,
            'Progress Status': s.studentStatus || 'N/A',
          }));
        } else if (report.id === 'internship-hackathon') {
          sheetName = 'Internship & Hackathon';
          excelRows = rawData.map((r: any) => ({
            'Student Name': r.studentName || 'N/A',
            'Register Number': r.registerNo || 'N/A',
            'Department': r.department || 'N/A',
            'Year': r.year || 'N/A',
            'Section': r.section || 'N/A',
            'Opportunity Name': r.opportunityName || 'N/A',
            'Opportunity Type': r.opportunityType || 'N/A',
            'Company / Organizer': r.company || 'N/A',
            'Registration Status': r.registrationStatus || 'N/A',
            'Registration Date': r.registrationDate || 'N/A',
            'Deadline': r.deadline || 'N/A',
            'Application Status': r.applicationStatus || 'N/A',
          }));
        } else if (report.id === 'application-placement') {
          sheetName = 'Applications & Placements';
          excelRows = rawData.map((a: any) => ({
            'Student Name': a.studentName || 'N/A',
            'Register Number': a.registerNo || 'N/A',
            'Department': a.department || 'N/A',
            'Year': a.year || 'N/A',
            'Section': a.section || 'N/A',
            'Opportunity Name': a.opportunityName || 'N/A',
            'Opportunity Type': a.opportunityType || 'N/A',
            'Company': a.company || 'N/A',
            'Application Status': a.applicationStatus || 'N/A',
            'Registration Status': a.registrationStatus || 'N/A',
            'Applied Date': a.appliedDate || 'N/A',
            'Current Stage': a.currentStage || 'N/A',
            'Interview Status': a.interviewStatus || 'N/A',
            'Offer Status': a.offerStatus || 'N/A',
          }));
        } else if (report.id === 'resume-readiness') {
          sheetName = 'Resume & Readiness';
          excelRows = rawData.map((r: any) => ({
            'Student Name': r.studentName || 'N/A',
            'Register Number': r.registerNo || 'N/A',
            'Department': r.department || 'N/A',
            'Year': r.year || 'N/A',
            'Section': r.section || 'N/A',
            'Resume Uploaded': r.resumeUploaded || 'No',
            'Resume Status': r.resumeStatus || 'Not Uploaded',
            'Resume Upload Date': r.resumeUploadDate || 'N/A',
            'Skills': r.skills || 'None',
            'Career Readiness': r.profileCompletion || '0%',
            'Mentor Review Status': r.resumeStatus || 'N/A',
            'Mentor Comments': r.mentorFeedback || 'N/A',
          }));
        }

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const safeTitle = report.id.replace(/-/g, '_');
        const filename = `CareerAI_Mentor_${safeTitle}_Report_${currentDateStr}.xlsx`;
        XLSX.writeFile(workbook, filename);
      } else {
        // PDF Export using Official KIT Template
        const { generateKitOfficialPdf } = await import('@/lib/kitReportPdf');

        let columns: { header: string }[] = [];
        let pdfBody: any[][] = [];

        if (report.id === 'assigned-career') {
          columns = [
            { header: 'Student Name' },
            { header: 'Reg No' },
            { header: 'Dept' },
            { header: 'Yr' },
            { header: 'Sec' },
            { header: 'CGPA' },
            { header: 'Resume' },
            { header: 'Apps' },
            { header: 'Regs' },
            { header: 'Status' }
          ];
          pdfBody = rawData.map((s: any) => [
            s.name || 'N/A',
            s.registerNo || 'N/A',
            s.department || 'N/A',
            String(s.year || 'N/A'),
            s.section || 'N/A',
            String(s.cgpa || 'N/A'),
            s.resumeStatus || 'Not Uploaded',
            String(s.applicationsCount || 0),
            String(s.registrationsCount || 0),
            s.studentStatus || 'N/A',
          ]);
        } else if (report.id === 'internship-hackathon') {
          columns = [
            { header: 'Student Name' },
            { header: 'Reg No' },
            { header: 'Opportunity Name' },
            { header: 'Type' },
            { header: 'Company' },
            { header: 'Status' },
            { header: 'Reg Date' },
            { header: 'Deadline' }
          ];
          pdfBody = rawData.map((r: any) => [
            r.studentName || 'N/A',
            r.registerNo || 'N/A',
            r.opportunityName || 'N/A',
            r.opportunityType || 'N/A',
            r.company || 'N/A',
            r.registrationStatus || 'N/A',
            r.registrationDate || 'N/A',
            r.deadline || 'N/A',
          ]);
        } else if (report.id === 'application-placement') {
          columns = [
            { header: 'Student Name' },
            { header: 'Reg No' },
            { header: 'Opportunity Name' },
            { header: 'Type' },
            { header: 'Company' },
            { header: 'App Status' },
            { header: 'Applied Date' },
            { header: 'Interview' },
            { header: 'Offer Status' }
          ];
          pdfBody = rawData.map((a: any) => [
            a.studentName || 'N/A',
            a.registerNo || 'N/A',
            a.opportunityName || 'N/A',
            a.opportunityType || 'N/A',
            a.company || 'N/A',
            a.applicationStatus || 'N/A',
            a.appliedDate || 'N/A',
            a.interviewStatus || 'N/A',
            a.offerStatus || 'N/A',
          ]);
        } else if (report.id === 'resume-readiness') {
          columns = [
            { header: 'Student Name' },
            { header: 'Reg No' },
            { header: 'Uploaded' },
            { header: 'Resume Status' },
            { header: 'Upload Date' },
            { header: 'Skills' },
            { header: 'Readiness' },
            { header: 'Mentor Comments' }
          ];
          pdfBody = rawData.map((r: any) => [
            r.studentName || 'N/A',
            r.registerNo || 'N/A',
            r.resumeUploaded || 'No',
            r.resumeStatus || 'Not Uploaded',
            r.resumeUploadDate || 'N/A',
            r.skills || 'None',
            r.profileCompletion || '0%',
            r.mentorFeedback || 'N/A',
          ]);
        }

        const safeTitle = report.id.replace(/-/g, '_');
        const filename = `KIT_Mentor_${safeTitle}_Report_${currentDateStr}.pdf`;

        await generateKitOfficialPdf({
          orientation: report.id === 'assigned-career' || report.id === 'application-placement' ? 'landscape' : 'portrait',
          reportTitle: report.title,
          mentorName: currentMentor?.name,
          mentorEmail: currentMentor?.email,
          academicYear: '2025 - 2026',
          columns,
          data: pdfBody,
          filename,
        });
      }
    } catch (err: any) {
      console.error(`Failed to download report:`, err);
      if (format === 'pdf') {
        setErrorNotice('Unable to generate PDF report. Please try again.');
      } else {
        setErrorNotice('Unable to generate Excel report. Please try again.');
      }
    } finally {
      setDownloadingId(null);
      setDownloadFormat(null);
    }
  };

  const activeReports = reports.filter(
    (r) => selectedReportType === 'ALL' || r.id === selectedReportType
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-kit-600" /> Mentor Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Download reports and insights for your assigned students</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kit-700 transition-colors shadow-sm w-fit"
        >
          <Printer className="h-4 w-4" /> Print / Export Page
        </button>
      </motion.div>

      {/* Quick Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Assigned Students</span>
            <Users className="h-4 w-4 text-kit-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingMetrics ? '…' : summary.assignedStudentsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Internship Regs</span>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingMetrics ? '…' : summary.internshipRegistrationsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Hackathon Regs</span>
            <Trophy className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingMetrics ? '…' : summary.hackathonRegistrationsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">With Resume</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {loadingMetrics ? '…' : summary.studentsWithResume}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">No Resume</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {loadingMetrics ? '…' : summary.studentsWithoutResume}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Needs Attention</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {loadingMetrics ? '…' : summary.studentsNeedingAttention}
          </p>
        </div>
      </motion.div>

      {/* Empty State Banner if no assigned students */}
      {!loadingMetrics && summary.assignedStudentsCount === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-2xs">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-amber-900">No students assigned</h3>
          <p className="text-xs text-amber-700 mt-1">Reports will become available once students are assigned to you by your HOD or Placement Cell.</p>
        </motion.div>
      )}

      {/* Filter Section — Clean 4-Column Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-kit-600" /> Report Filters
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Customize report parameters before downloading PDF or Excel</p>
          </div>
          {(selectedReportType !== 'ALL' || selectedOpportunityType !== 'ALL' || selectedRegStatus !== 'ALL' || selectedResumeStatus !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors w-fit"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Report Card Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Report Card</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
            >
              <option value="ALL">All Reports</option>
              <option value="assigned-career">Assigned Student Career Report</option>
              <option value="internship-hackathon">Internship & Hackathon Report</option>
              <option value="application-placement">Student Application & Placement Report</option>
              <option value="resume-readiness">Resume & Student Readiness Report</option>
            </select>
          </div>

          {/* 2. Opportunity Type Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Opportunity Type</label>
            <select
              value={selectedOpportunityType}
              onChange={(e) => setSelectedOpportunityType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
            >
              <option value="ALL">All Types</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="HACKATHON">Hackathon</option>
            </select>
          </div>

          {/* 3. Registration Status Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Reg Status</label>
            <select
              value={selectedRegStatus}
              onChange={(e) => setSelectedRegStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
            >
              <option value="ALL">All Reg Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="INITIATED">Initiated</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="SELECTED">Selected</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>

          {/* 4. Resume Status Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Resume Status</label>
            <select
              value={selectedResumeStatus}
              onChange={(e) => setSelectedResumeStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
            >
              <option value="ALL">All Resume Statuses</option>
              <option value="UPLOADED">Uploaded</option>
              <option value="NOT_UPLOADED">Not Uploaded</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
            </select>
          </div>
        </div>
      </motion.div>

      {errorNotice && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex justify-between items-center">
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="text-gray-500 hover:text-gray-700 font-bold">Dismiss</button>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {activeReports.map((r) => {
          const isThisDownloading = downloadingId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-kit-200 transition-colors">
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
                    disabled={Boolean(downloadingId)}
                    onClick={() => handleDownload(r, 'pdf')}
                    className="flex items-center gap-1.5 text-xs font-bold text-kit-600 hover:text-kit-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isThisDownloading && downloadFormat === 'pdf' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    disabled={Boolean(downloadingId)}
                    onClick={() => handleDownload(r, 'excel')}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isThisDownloading && downloadFormat === 'excel' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Excel...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Download Excel</span>
                      </>
                    )}
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
