import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Home, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { rentalsApi } from '../../api/rentals.js';
import { saveRentIntent, clearRentIntent } from '../../utils/rentIntent.js';
import { formatCurrency } from '../../utils/currency.js';

// Where the company's website sends someone who wants to rent a unit or a
// building (/:orgSlug/rent?unit=<id> or ?building=<id>). Signed out, it asks
// them to sign in or create an account (remembering what they wanted); signed
// in as a tenant, it registers the place under their one tenant record.
export default function RentPage() {
  const { orgSlug } = useParams();
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get('unit');
  const buildingId = searchParams.get('building');
  const { user, loading } = useAuth();
  const [listing, setListing] = useState(null);
  const [state, setState] = useState('idle'); // idle | working | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const submitted = useRef(false);

  const missingTarget = !unitId && !buildingId;

  useEffect(() => {
    if (!unitId) return;
    rentalsApi.publicListing(orgSlug, unitId).then((res) => setListing(res.data)).catch(() => {});
  }, [orgSlug, unitId]);

  useEffect(() => {
    if (loading || missingTarget) return;
    if (!user) {
      saveRentIntent({ orgSlug, unitId, buildingId });
      return;
    }
    if (!user.roles.includes('tenant') || submitted.current) return;
    submitted.current = true;
    setState('working');
    rentalsApi.request(unitId ? { unitId } : { buildingId })
      .then((res) => {
        clearRentIntent();
        setResult(res.data);
        setState('done');
      })
      .catch((err) => {
        setError(err.message);
        setState('error');
      });
  }, [loading, user, orgSlug, unitId, buildingId, missingTarget]);

  const what = listing?.title ?? (unitId ? 'this unit' : 'this building');

  let body;
  if (missingTarget) {
    body = <Alert variant="error">This rental link is incomplete. Please go back to the website and choose a property again.</Alert>;
  } else if (loading) {
    body = <LoadingState label="Checking your session…" />;
  } else if (!user) {
    body = (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
          <p className="font-medium text-slate-900 dark:text-slate-100">{what}</p>
          {listing && <p className="mt-1 text-slate-500 dark:text-slate-400">{formatCurrency(listing.price)} / month</p>}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">To rent it, sign in — or create an account if you do not have one yet.</p>
        <Link to={`/${orgSlug}/register`}><Button className="w-full">Create an account</Button></Link>
        <Link to={`/${orgSlug}/login`}><Button variant="secondary" className="w-full">I already have an account</Button></Link>
      </div>
    );
  } else if (!user.roles.includes('tenant')) {
    body = <Alert variant="warning">You are signed in with a staff account, which cannot rent a property. Sign out and use a tenant account.</Alert>;
  } else if (state === 'working' || state === 'idle') {
    body = <LoadingState label="Registering your rental…" />;
  } else if (state === 'error') {
    body = <Alert variant="error">{error}</Alert>;
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 size={40} className="text-emerald-500" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{result.rental.label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {result.alreadyHeld
            ? 'This is already registered under your account.'
            : 'It has been added to your account, and the owner and agents have been notified.'}
        </p>
        <Link to="/my-rentals" className="w-full"><Button className="w-full"><Home size={15} aria-hidden="true" /> View my properties</Button></Link>
      </div>
    );
  }

  return (
    <AuthLayout title="Rent a property" description="Register the place you want to rent under your account.">
      {body}
    </AuthLayout>
  );
}
