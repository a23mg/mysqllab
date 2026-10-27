import React, { useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { CartItem, DatabaseAdapter, Product } from '../types/index.ts';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { CatalogView } from './views/CatalogView.tsx';
import { ManageView } from './views/ManageView.tsx';
import { CartView } from './views/CartView.tsx';
import { OrdersView } from './views/OrdersView.tsx';
import { SeederView } from './views/SeederView.tsx';

export interface AppProps {
  db: DatabaseAdapter;
}

export const App: React.FC<AppProps> = ({ db }) => {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Welcome to mysqllab e-commerce! Press 1-5 to navigate tabs.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  const setStatus = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((it): it is CartItem => it !== null);
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Global tab navigation
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    // Switch tabs with 1, 2, 3, 4, 5
    if (input === '1') setActiveTab(1);
    else if (input === '2') setActiveTab(2);
    else if (input === '3') setActiveTab(3);
    else if (input === '4') setActiveTab(4);
    else if (input === '5') setActiveTab(5);
  });

  const cartItemCount = cart.reduce((sum, it) => sum + it.quantity, 0);
  const cartTotal = cart.reduce((sum, it) => sum + it.product.price * it.quantity, 0);

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        activeTab={activeTab}
        connectionInfo={db.connectionInfo}
        cartItemCount={cartItemCount}
        cartTotal={cartTotal}
      />

      <Box minHeight={14} flexDirection="column">
        {activeTab === 1 && (
          <CatalogView
            db={db}
            onAddToCart={handleAddToCart}
            setStatus={setStatus}
            isActive={activeTab === 1}
          />
        )}
        {activeTab === 2 && (
          <ManageView
            db={db}
            setStatus={setStatus}
            isActive={activeTab === 2}
          />
        )}
        {activeTab === 3 && (
          <CartView
            db={db}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            setStatus={setStatus}
            isActive={activeTab === 3}
          />
        )}
        {activeTab === 4 && (
          <OrdersView
            db={db}
            setStatus={setStatus}
            isActive={activeTab === 4}
          />
        )}
        {activeTab === 5 && (
          <SeederView
            db={db}
            setStatus={setStatus}
            isActive={activeTab === 5}
          />
        )}
      </Box>

      <Footer
        statusMessage={statusMessage}
        statusType={statusType}
      />
    </Box>
  );
};
