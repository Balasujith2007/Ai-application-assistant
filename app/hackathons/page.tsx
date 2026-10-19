import { redirect } from 'next/navigation';

export default function HackathonsPage() {
  redirect('/dashboard/student/opportunities?tab=HACKATHONS');
}
