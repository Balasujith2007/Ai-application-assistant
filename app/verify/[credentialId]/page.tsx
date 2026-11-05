import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, BadgeCheck, CalendarDays, Hash, ShieldCheck, XCircle } from 'lucide-react';
import { badgeEngine } from '@/lib/gamification/badgeEngine';
import { BadgeEmblem } from '@/components/badges/BadgeEmblem';
import type { BadgeCategory, BadgeTier } from '@/lib/gamification/badgeConfig';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ credentialId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { credentialId } = await params;
  const result = await badgeEngine.verifyCredential(decodeURIComponent(credentialId));
  if (!result.found || !result.credential) {
    return { title: 'Credential not found | AI Career Platform', robots: { index: false } };
  }
  return {
    title: `${result.credential.badgeTitle} — Verified Credential | AI Career Platform`,
    description: `Platform-issued achievement credential for ${result.credential.badgeTitle}, awarded by AI Career Platform.`,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function VerifyCredentialPage({ params }: PageProps) {
  const { credentialId } = await params;
  const result = await badgeEngine.verifyCredential(decodeURIComponent(credentialId));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-700">
          <ShieldCheck className="h-5 w-5 text-[#990024]" />
          <span className="text-sm font-semibold tracking-wide">AI Career Platform · Credential Verification</span>
        </div>

        {!result.found || !result.credential ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Credential not found</h1>
            <p className="mt-2 text-sm text-slate-600">
              We could not find a credential with the id <span className="font-mono">{decodeURIComponent(credentialId)}</span>.
              Check the link, or ask the badge holder to re-share it.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Only platform-issued achievement credentials are stored here. No personal data is exposed.
            </p>
          </div>
        ) : (
          (() => {
            const c = result.credential!;
            const isValid = c.status === 'VALID';
            return (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                <div
                  className={`flex items-center justify-between px-6 py-4 ${
                    isValid ? 'bg-emerald-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-bold uppercase tracking-wide ${
                        isValid ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isValid ? 'Verified credential' : 'Credential revoked'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{c.credentialId}</span>
                </div>

                <div className="flex flex-col items-center gap-5 px-6 py-8 sm:flex-row sm:items-start sm:gap-8">
                  <BadgeEmblem
                    icon={c.icon}
                    tier={c.tier as BadgeTier}
                    category={c.category as BadgeCategory}
                    size={112}
                    locked={!isValid}
                    title={c.badgeTitle}
                  />
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#990024]">
                      {c.issuingOrganization}
                    </p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{c.badgeTitle}</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {c.category.replace(/_/g, ' ')} · {c.tier}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{c.description}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Awarded to</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">{c.holder}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <CalendarDays className="h-3 w-3" /> Issue date
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(c.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <Hash className="h-3 w-3" /> Credential ID
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">{c.credentialId}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Award source</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {c.awardSource === 'MONTHLY'
                        ? 'Monthly performance recognition'
                        : c.awardSource === 'MANUAL'
                          ? 'Platform review'
                          : 'Verified career activity'}
                    </dd>
                  </div>
                </dl>

                {c.criteria && (
                  <div className="border-t border-slate-100 px-6 py-5">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Verifiable criteria</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-700">{c.criteria}</dd>
                  </div>
                )}

                {!isValid && c.revokedReason && (
                  <div className="border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
                    <strong>Revocation reason:</strong> {c.revokedReason}
                  </div>
                )}

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-[11px] leading-relaxed text-slate-500">
                  This is a platform-issued achievement credential from AI Career Platform. It is not an external
                  accreditation or third-party certification. Verification shows only non-sensitive achievement
                  metadata — never applications, documents, contact details or internal performance records.
                </div>
              </div>
            );
          })()
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="font-semibold text-slate-500 hover:text-slate-700">
            AI Career Platform
          </Link>{' '}
          — Student Career Growth &amp; Opportunity Platform
        </p>
      </div>
    </main>
  );
}
