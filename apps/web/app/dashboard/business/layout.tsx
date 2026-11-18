'use client';

import { useEffect, useState } from 'react';

/**
 * The modular business panel is workspace-scoped: the header switcher only
 * changes the id that every request carries (`x-workspace-id`), so an already
 * mounted tab would keep showing the previous business's data. Remounting the
 * subtree on every switch forces each tab (cards, biolinks, accommodations,
 * products, …) to reload for the newly selected business.
 */
export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    function onWorkspaceChanged() {
      setGeneration((value) => value + 1);
    }
    window.addEventListener('alooshomal:workspace-changed', onWorkspaceChanged);
    return () =>
      window.removeEventListener(
        'alooshomal:workspace-changed',
        onWorkspaceChanged,
      );
  }, []);

  return (
    <div key={generation} className="contents">
      {children}
    </div>
  );
}
