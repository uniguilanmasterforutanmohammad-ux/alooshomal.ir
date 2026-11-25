'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * One cross-shop shopping cart, persisted in `localStorage`.
 *
 * Each line carries enough product/shop data to render the cart and submit an
 * order without re-fetching every product. Lines are keyed by `(slug,
 * productId)` because the same product id is unique per workspace but the
 * storefront is addressed by its public slug.
 */
export interface CartItem {
  productId: string;
  slug: string;
  shopName: string;
  title: string;
  price: number;
  unit: string;
  stock: number;
  imageUrl: string | null;
  quantity: number;
}

export type CartInput = Omit<CartItem, 'quantity'>;

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  /** total number of units across every shop */
  count: number;
  add: (item: CartInput, quantity?: number) => void;
  setQuantity: (slug: string, productId: string, quantity: number) => void;
  remove: (slug: string, productId: string) => void;
  clearShop: (slug: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'alooshomal.cart.v1';
const CartContext = createContext<CartContextValue | null>(null);

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CartItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.productId !== 'string' ||
      typeof item.slug !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.price !== 'number' ||
      typeof item.quantity !== 'number'
    ) {
      continue;
    }
    items.push({
      productId: item.productId,
      slug: item.slug,
      shopName: typeof item.shopName === 'string' ? item.shopName : '',
      title: item.title,
      price: item.price,
      unit: typeof item.unit === 'string' ? item.unit : 'عدد',
      stock: typeof item.stock === 'number' ? item.stock : 0,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
      quantity: Math.max(1, Math.floor(item.quantity)),
    });
  }
  return items;
}

function clampQuantity(quantity: number, stock: number): number {
  const max = Math.max(1, Math.floor(stock));
  return Math.min(max, Math.max(0, Math.floor(quantity)));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(sanitize(JSON.parse(stored)));
    } catch {
      // Ignore corrupt/unavailable storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be full or blocked; the in-memory cart still works.
    }
  }, [items, hydrated]);

  const add = useCallback((item: CartInput, quantity = 1) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (entry) => entry.slug === item.slug && entry.productId === item.productId,
      );
      if (index === -1) {
        return [
          ...prev,
          { ...item, quantity: clampQuantity(quantity, item.stock) || 1 },
        ];
      }
      const next = [...prev];
      const current = next[index];
      const stock = Math.min(item.stock, current.stock || item.stock);
      next[index] = {
        ...current,
        ...item,
        quantity: clampQuantity(current.quantity + quantity, stock),
      };
      return next;
    });
  }, []);

  const setQuantity = useCallback(
    (slug: string, productId: string, quantity: number) => {
      setItems((prev) =>
        prev.flatMap((entry) => {
          if (entry.slug !== slug || entry.productId !== productId) return [entry];
          const nextQuantity = clampQuantity(quantity, entry.stock);
          return nextQuantity <= 0 ? [] : [{ ...entry, quantity: nextQuantity }];
        }),
      );
    },
    [],
  );

  const remove = useCallback((slug: string, productId: string) => {
    setItems((prev) =>
      prev.filter(
        (entry) => !(entry.slug === slug && entry.productId === productId),
      ),
    );
  }, []);

  const clearShop = useCallback((slug: string) => {
    setItems((prev) => prev.filter((entry) => entry.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      count,
      add,
      setQuantity,
      remove,
      clearShop,
      clear,
    }),
    [items, hydrated, count, add, setQuantity, remove, clearShop, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return context;
}
