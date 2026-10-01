import { useState } from 'react';
import { Send } from 'lucide-react';
import { Alert } from '../ui/Alert.jsx';

// The message box. `sendPayload(payload, attachmentId?)` encrypts and sends.
export function Composer({ disabled, sendPayload }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    setError(null);
    try {
      await sendPayload({ t: 'text', body });
      setText('');
    } catch (err) {
      setError(err.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e);
  };

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      {error && <Alert variant="error" className="mb-2">{error}</Alert>}
      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} rows={1} maxLength={4000} disabled={disabled}
          placeholder={disabled ? 'Waiting for the conversation to be unlocked…' : 'Write a message'} aria-label="Message"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button type="submit" disabled={disabled || sending || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
          <Send size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
