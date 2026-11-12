'use client';

import { TaxonomyNodePicker } from './TaxonomyNodePicker';

interface Props {
  /** main category chosen in the builder's «کسب‌وکار» select (`''` = none) */
  businessId: string;
  /** chosen «زیردسته» name (`''` = none) */
  subCategory: string;
  /** chosen «زیرشاخه» name (`''` = none) */
  subSubCategory: string;
  onSubCategoryChange: (name: string) => void;
  onSubSubCategoryChange: (name: string) => void;
}

/**
 * The two optional deeper taxonomies of the biolink / business-card builder.
 * Both are *search* pickers (the tree has thousands of nodes) and both are
 * anchored to the chosen main category, so they are disabled until it is set.
 */
export function BusinessTaxonomyFields({
  businessId,
  subCategory,
  subSubCategory,
  onSubCategoryChange,
  onSubSubCategoryChange,
}: Props) {
  function changeSubCategory(name: string) {
    onSubCategoryChange(name);
    // A tag belongs to a sub-category, so changing it drops a stale tag.
    if (subSubCategory && name !== subCategory) onSubSubCategoryChange('');
  }

  return (
    <>
      <TaxonomyNodePicker
        key={`sub-${businessId}`}
        label="زیردسته"
        level="SUB"
        categoryId={businessId}
        value={subCategory}
        onChange={changeSubCategory}
        placeholder="نام زیردسته را بنویسید..."
        disabledHint="ابتدا «کسب‌وکار» را انتخاب کنید."
      />
      <TaxonomyNodePicker
        key={`tag-${businessId}-${subCategory}`}
        label="زیرشاخه"
        level="TAG"
        categoryId={businessId}
        parentName={subCategory}
        value={subSubCategory}
        onChange={onSubSubCategoryChange}
        placeholder="نام زیرشاخه را بنویسید..."
        disabledHint="ابتدا «کسب‌وکار» را انتخاب کنید."
      />
    </>
  );
}
