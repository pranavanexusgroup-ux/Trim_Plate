import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, SubscriptionPlan } from '../types';
import { useSite } from './SiteContext';

interface CartContextValue {
  items: CartItem[];
  appliedCoupon: { code: string; discount: number } | null;
  subtotal: number;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  taxRatePercent: number;
  gstAmount: number;
  totalAmount: number;
  itemCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addProductToCart: (product: Product, variantName?: string, overridePrice?: number, qty?: number) => void;
  addSubscriptionToCart: (
    plan: SubscriptionPlan,
    options: {
      menuPreference: string;
      selectedMeals: string;
      isVegOnly: boolean;
      startDate: string;
      deliverySlot: string;
    }
  ) => void;
  updateQuantity: (key: string, delta: number) => void;
  removeItem: (key: string) => void;
  setCoupon: (coupon: { code: string; discount: number } | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { site } = useSite();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('tp_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tp_cart', JSON.stringify(items));
  }, [items]);

  const addProductToCart = (product: Product, variantName?: string, overridePrice?: number, qty = 1) => {
    const unitPrice = overridePrice ?? product.price;
    if (unitPrice === null || unitPrice === undefined) return;
    const key = `prod-${product.id}-${variantName || 'std'}`;

    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [
        ...prev,
        {
          key,
          item_type: 'product',
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          variant_name: variantName || '',
          unit_price: Number(unitPrice),
          quantity: qty,
          image_key: product.image_key,
          custom_image_url: product.custom_image_url,
        },
      ];
    });
  };

  const addSubscriptionToCart = (
    plan: SubscriptionPlan,
    options: {
      menuPreference: string;
      selectedMeals: string;
      isVegOnly: boolean;
      startDate: string;
      deliverySlot: string;
    }
  ) => {
    const key = `sub-${plan.id}-${options.menuPreference}-${options.startDate}`;
    setItems((prev) => {
      const filtered = prev.filter((i) => i.key !== key);
      return [
        ...filtered,
        {
          key,
          item_type: 'subscription',
          plan_id: plan.id,
          name: `${options.menuPreference} – ${plan.name}`,
          variant_name: `${options.selectedMeals} (${options.isVegOnly ? 'Pure Veg' : 'Veg + Non-Veg'})`,
          unit_price: plan.price,
          quantity: 1,
          image_key: 'meal_prep_tray',
          meta: {
            ...options,
            durationDays: plan.duration_days,
          },
        },
      ];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
  };

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const configuredDelivery = Number(site.settings.delivery_charge ?? 40);
  const freeDeliveryThreshold = Number(site.settings.free_delivery_threshold ?? 599);
  const taxRatePercent = Number(site.settings.tax_percent ?? site.settings.tax_percentage ?? 5);

  const deliveryCharge = items.length === 0 ? 0 : subtotal >= freeDeliveryThreshold ? 0 : configuredDelivery;
  const gstAmount = Math.round((subtotal * taxRatePercent) / 100);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const totalAmount = Math.max(0, subtotal + deliveryCharge + gstAmount - discount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        appliedCoupon,
        subtotal,
        deliveryCharge,
        freeDeliveryThreshold,
        taxRatePercent,
        gstAmount,
        totalAmount,
        itemCount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addProductToCart,
        addSubscriptionToCart,
        updateQuantity,
        removeItem,
        setCoupon,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
