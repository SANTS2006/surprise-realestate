import { useEffect, useState } from 'react';

// Fetches total-per-status counts for a list page's stat cards by piggy-
// backing on the same paginated `list` endpoint the page already calls
// (each request asks for `pageSize: 1` and reads `meta.total`) — avoids
// needing a dedicated stats endpoint per entity type. `statuses` is an
// array of status values to count in addition to the unfiltered total;
// results land in a `{ total, [status]: count }` object.
export function useStatusCounts(listFn, statuses, deps = []) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setCounts(null);
    Promise.all([
      listFn({ pageSize: 1 }),
      ...statuses.map((status) => listFn({ pageSize: 1, status })),
    ])
      .then((results) => {
        if (cancelled) return;
        const next = { total: results[0].meta.total };
        statuses.forEach((status, i) => { next[status] = results[i + 1].meta.total; });
        setCounts(next);
      })
      .catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return counts;
}
