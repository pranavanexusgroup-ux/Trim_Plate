import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider } from './context/SiteContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WebsiteLayout } from './layouts/WebsiteLayout';
import { HomePage } from './pages/HomePage';
import { MenuCatalogPage } from './pages/MenuCatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { DietAndGymLandingPage } from './pages/DietAndGymLandingPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { OffersPage } from './pages/OffersPage';
import { CartAndCheckoutPage } from './pages/CartAndCheckoutPage';
import { CmsContentPage } from './pages/CmsContentPage';
import { LoginPage, CustomerAccountPage } from './pages/AuthAndAccountPage';
import { AdminPortal } from './admin/AdminPortal';

export default function App() {
  return (
    <ToastProvider>
      <SiteProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Public & Customer E-Commerce Website */}
                <Route element={<WebsiteLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/cafe-menu"
                    element={<MenuCatalogPage division="Cafe Menu" />}
                  />
                  <Route
                    path="/green-menu"
                    element={<MenuCatalogPage division="Green Menu" />}
                  />
                  <Route path="/menu/:slug" element={<MenuCatalogPage />} />
                  <Route
                    path="/diet-menu"
                    element={<DietAndGymLandingPage mode="diet" />}
                  />
                  <Route
                    path="/gym-menu"
                    element={<DietAndGymLandingPage mode="gym" />}
                  />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/offers" element={<OffersPage />} />
                  <Route path="/product/:slug" element={<ProductDetailPage />} />
                  <Route path="/page/:slug" element={<CmsContentPage />} />
                  <Route path="/cart" element={<CartAndCheckoutPage />} />
                  <Route path="/checkout" element={<CartAndCheckoutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/account" element={<CustomerAccountPage />} />
                  <Route
                    path="/orders"
                    element={<Navigate to="/account?tab=orders" replace />}
                  />
                </Route>

                {/* Complete 30-Module Website CMS & Operations Admin Panel */}
                <Route path="/admin/*" element={<AdminPortal />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </SiteProvider>
    </ToastProvider>
  );
}
