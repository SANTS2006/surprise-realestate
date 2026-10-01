// Renders one decrypted message payload. Text is shown as plain text (never
// as HTML), so a message can never inject markup into anyone's page.
export function MessageBody({ message }) {
  const { payload } = message;
  if (payload?.t === 'text') {
    return <p className="whitespace-pre-wrap break-words">{payload.body}</p>;
  }
  return <p className="italic opacity-70">Unsupported message.</p>;
}
