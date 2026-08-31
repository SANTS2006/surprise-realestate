import { useEffect } from 'react';

// Every route shared the same static <title> from index.html until now —
// bad for tab-switching/history/bookmarks, and search engines that do
// index a page (e.g. /login) see a generic title. Restores the previous
// title on unmount so a modal-like page transition never leaves a stale one.
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — Surprise Real Estate` : 'Surprise Real Estate — Property Management System';
    return () => { document.title = previous; };
  }, [title]);
}
