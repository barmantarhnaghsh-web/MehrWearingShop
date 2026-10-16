'use client';

/**
 * Global client state: session (auth) + cart.
 * Mirrors what a mobile/desktop client would keep locally.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, clearTokens, getAccessToken, getStoredRefresh, setTokens } from './api';
import type { ApiResponse } from './api';
import type { AuthTokens, Cart, User } from './types';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  firstName: string;
  lastName: string;
  phone?: string;
}

interface StoreValue {
  user: User | null;
  ready: boolean;
  cart: Cart;
  cartCount: number;
  cartLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  setCartQty: (variantId: string, quantity: number) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
  applyCoupon: (code: string | null) => Promise<void>;
  clearCartLocal: () => void;
}

const emptyCart: Cart = {
  id: '',
  guestId: null,
  couponCode: null,
  items: [],
  totals: { subtotal: 0, discount: 0, shippingCost: 0, total: 0, couponCode: null },
};

const StoreContext = createContext<StoreValue | null>(null);

export function MallProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [cartLoading, setCartLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await api.get<ApiResponse<Cart>>('/cart');
      setCart(res.data);
    } catch {
      // keep last known cart; server stays source of truth on next action
    } finally {
      setCartLoading(false);
    }
  }, []);

  // Hydrate session + cart on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getAccessToken() || getStoredRefresh()) {
        try {
          const res = await api.get<ApiResponse<User>>('/me', { auth: true });
          if (!cancelled) setUser(res.data);
        } catch {
          clearTokens();
        }
      }
      if (!cancelled) {
        await refreshCart();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCart]);

  const applyAuth = useCallback((u: User, tokens: AuthTokens) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(u);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', input);
      applyAuth(res.data.user, res.data.tokens);
      await refreshCart();
    },
    [applyAuth, refreshCart],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', input);
      applyAuth(res.data.user, res.data.tokens);
      await refreshCart();
    },
    [applyAuth, refreshCart],
  );

  const loginWithOtp = useCallback(
    async (phone: string, code: string) => {
      const res = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/otp/verify', {
        phone,
        code,
      });
      applyAuth(res.data.user, res.data.tokens);
      await refreshCart();
    },
    [applyAuth, refreshCart],
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefresh();
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore network errors on logout
    }
    clearTokens();
    setUser(null);
    await refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      const res = await api.post<ApiResponse<Cart>>('/cart/items', { variantId, quantity });
      setCart(res.data);
    },
    [],
  );

  const setCartQty = useCallback(async (variantId: string, quantity: number) => {
    const res = await api.patch<ApiResponse<Cart>>(`/cart/items/${variantId}`, { quantity });
    setCart(res.data);
  }, []);

  const removeFromCart = useCallback(async (variantId: string) => {
    const res = await api.delete<ApiResponse<Cart>>(`/cart/items/${variantId}`);
    setCart(res.data);
  }, []);

  const applyCoupon = useCallback(async (code: string | null) => {
    const res = await api.put<ApiResponse<Cart>>('/cart/coupon', { code });
    setCart(res.data);
  }, []);

  const clearCartLocal = useCallback(() => setCart(emptyCart), []);

  const cartCount = useMemo(() => cart.items.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const value: StoreValue = {
    user,
    ready,
    cart,
    cartCount,
    cartLoading,
    login,
    register,
    loginWithOtp,
    logout,
    refreshCart,
    addToCart,
    setCartQty,
    removeFromCart,
    applyCoupon,
    clearCartLocal,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <MallProvider>');
  return ctx;
}

/** Extract a friendly message from an ApiError (or any error). */
export function errorMessage(err: unknown, fallback = 'خطایی رخ داد'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
