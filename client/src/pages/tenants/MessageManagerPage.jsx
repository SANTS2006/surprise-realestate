import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { TextareaField } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { tenantMessagesApi } from '../../api/tenantMessages.js';

// One-directional (Phase 1): a tenant composes a message that reaches the
// agent(s) assigned to their property, as an in-app notification and an
// email. No reply/thread view here yet — a natural follow-up.
export default function MessageManagerPage() {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await tenantMessagesApi.create(content.trim());
      setContent('');
      setSent(true);
    } catch (err) {
      setError(err.details?.map((d) => d.message).join(' ') || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Message your property manager</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Send a message to the agent managing your property — they'll be notified in the app and by email.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <MessageSquare size={16} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New message</h2>
        </CardHeader>
        <CardBody>
          {sent && <Alert variant="success" className="mb-4">Your message has been sent.</Alert>}
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <TextareaField
              label="Message"
              placeholder="e.g. The kitchen faucet has been leaking since yesterday — could someone take a look?"
              rows={5}
              value={content}
              onChange={(e) => { setContent(e.target.value); setSent(false); }}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={submitting} disabled={!content.trim()}>Send message</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
