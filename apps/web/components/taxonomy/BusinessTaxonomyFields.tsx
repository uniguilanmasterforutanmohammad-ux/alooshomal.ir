'use client';

import { useState } from 'react';

import { TaxonomyNodePicker, type TaxonomyPick } from './TaxonomyNodePicker';

interface Props {
  /** main category chosen in the builder's «کسب‌وکار» select (`''` = none) */
  businessId: string;
  /** chosen «زیردسته» name (`''` = none) */
  subCategory: string;
  /** chosen «زیرشاخه» name (`''` = none) */
  subSubCategory: string;
  /** both deeper-level fields at once (they are picked from one search box) */
  onChange: (next: { subCategory: string; subSubCategory: string }) => void;
}

/**
 * The optional deeper taxonomy of the biolink / business-card / business
 * builder. It is a single *search* box (the tree has thousands of nodes):
 * the user types once and the API walks «زیرشاخه» then «زیردسته»; when neither
 * matches, the term is sent to the admins and «سایر» is stored. It stays
 * disabled until a main category is chosen, which anchors the search.
 */
export function BusinessTaxonomyFields({
  businessId,
  subCategory,
  subSubCategory,
  onChange,
}: Props) {
  // The stored fields only hold names, so the picked *level* (needed for the
  // «زیرشاخه» / «زیردسته» / «سایر» badge) is tracked alongside them.
  const [kind, setKind] = useState<'SUB' | 'TAG' | 'OTHER' | null>(() =>
    subSubCategory ? 'TAG' : subCategory ? 'SUB' : null,
  );

  function handlePick(pick: TaxonomyPick) {
    if (pick.kind === 'CLEAR') {
      setKind(null);
      onChange({ subCategory: '', subSubCategory: '' });
      return;
    }
    setKind(pick.kind);
    if (pick.kind === 'TAG') {
      // A tag is stored together with its parent sub-category.
      onChange({ subCategory: pick.parentName ?? '', subSubCategory: pick.name });
      return;
    }
    // «زیردسته» or the free-text «سایر» both live in the sub-category field.
    onChange({ subCategory: pick.name, subSubCategory: '' });
  }

  return (
    <TaxonomyNodePicker
      key={businessId}
      label="زیردسته / زیرشاخه"
      categoryId={businessId}
      value={subSubCategory || subCategory}
      kind={kind}
      onChange={handlePick}
      placeholder="مثلاً: کافه، تعمیر موبایل،... "
      disabledHint="ابتدا «کسب‌وکار» را انتخاب کنید."
    />
  );
}
