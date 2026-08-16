import { redirect } from 'next/navigation';

// Interview section removed from Student Dashboard.
// This route now redirects to the Student Dashboard.
export default function StudentInterviewsPage() {
  redirect('/dashboard/student');
}
