import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
// @ts-ignore
import TextInputComponent from 'ink-text-input';
const TextInput = (TextInputComponent as any).default || TextInputComponent;
import type { CartItem, DatabaseAdapter, Order } from '../../types/index.ts';

export interface CartViewProps {
  db: DatabaseAdapter;
  cart: CartItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  setStatus: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isActive: boolean;
}

export const CartView: React.FC<CartViewProps> = ({
  db,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  setStatus,
  isActive
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customerName, setCustomerName] = useState('Customer #1');
  const [isEditingName, setIsEditingName] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const subtotal = cart.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
  const tax = subtotal * 0.07; // 7% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setStatus('Cart is empty!', 'error');
      return;
    }
    try {
      const order = await db.createOrder(
        customerName.trim() || 'Anonymous Customer',
        cart.map(c => ({ productId: c.product.id, quantity: c.quantity }))
      );
      setPlacedOrder(order);
      onClearCart();
      setStatus(`Order #${order.id} placed successfully!`, 'success');
    } catch (err: any) {
      setStatus(`Checkout failed: ${err.message}`, 'error');
    }
  };

  useInput((input, key) => {
    if (!isActive) return;

    if (placedOrder) {
      if (key.return || key.escape || input === 'b' || input === 'B') {
        setPlacedOrder(null);
      }
      return;
    }

    if (isEditingName) {
      if (key.return || key.escape) {
        setIsEditingName(false);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(cart.length - 1, prev + 1));
    } else if (input === '+' || input === '=') {
      const item = cart[selectedIndex];
      if (item) {
        if (item.quantity >= item.product.stock) {
          setStatus(`Cannot add more. Only ${item.product.stock} available in stock.`, 'error');
        } else {
          onUpdateQuantity(item.product.id, 1);
        }
      }
    } else if (input === '-' || input === '_') {
      const item = cart[selectedIndex];
      if (item) {
        onUpdateQuantity(item.product.id, -1);
      }
    } else if (input === 'r' || input === 'R' || key.delete) {
      const item = cart[selectedIndex];
      if (item) {
        onRemoveItem(item.product.id);
        setStatus(`Removed "${item.product.title}" from cart`, 'info');
      }
    } else if (input === 'e' || input === 'E') {
      setIsEditingName(true);
    } else if (input === 'c' || input === 'C') {
      handleCheckout();
    }
  });

  if (placedOrder) {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="green" padding={1}>
        <Text bold color="green">🎉 ORDER CONFIRMATION #{placedOrder.id}</Text>
        <Box marginY={1} flexDirection="column">
          <Text><Text bold>Customer: </Text>{placedOrder.customerName}</Text>
          <Text><Text bold>Date: </Text>{placedOrder.createdAt}</Text>
          <Text><Text bold>Total Items: </Text>{placedOrder.totalItems}</Text>
          <Text><Text bold>Total Paid: </Text><Text bold color="green">${placedOrder.totalAmount.toFixed(2)}</Text></Text>
        </Box>
        <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
          <Text bold color="cyan">Ordered Items:</Text>
          {placedOrder.items.map((it, idx) => (
            <Text key={idx}>
              • {it.quantity}x {it.productTitle} @ ${it.price.toFixed(2)} = ${it.total.toFixed(2)}
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">[Enter / Esc] Return to Store</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Customer Name Banner */}
      <Box justifyContent="space-between" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box gap={1}>
          <Text bold color="cyan">Customer: </Text>
          {isEditingName ? (
            <TextInput
              value={customerName}
              onChange={setCustomerName}
              onSubmit={() => setIsEditingName(false)}
            />
          ) : (
            <Text bold color="white">{customerName}</Text>
          )}
          <Text color="gray">[Press E to edit name]</Text>
        </Box>
        <Box>
          <Text color="yellow" bold>{cart.length} item kinds</Text>
        </Box>
      </Box>

      {/* Cart Items Table */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Box width="46%"><Text bold color="blue">Product</Text></Box>
        <Box width="18%"><Text bold color="blue">Price</Text></Box>
        <Box width="16%"><Text bold color="blue">Quantity</Text></Box>
        <Box width="20%"><Text bold color="blue">Subtotal</Text></Box>
      </Box>

      {cart.length === 0 ? (
        <Box padding={2} justifyContent="center">
          <Text color="gray">Your shopping cart is empty! Head over to Tab 1 to browse & add items.</Text>
        </Box>
      ) : (
        cart.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const itemTotal = item.product.price * item.quantity;
          return (
            <Box key={item.product.id} paddingX={1} backgroundColor={isSelected ? 'gray' : undefined}>
              <Box width="46%">
                <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                  {item.product.title.length > 36 ? `${item.product.title.substring(0, 33)}...` : item.product.title}
                </Text>
              </Box>
              <Box width="18%">
                <Text>${item.product.price.toFixed(2)}</Text>
              </Box>
              <Box width="16%">
                <Text bold color="yellow">
                  [ - ] {item.quantity} [ + ]
                </Text>
              </Box>
              <Box width="20%">
                <Text bold color="green">
                  ${itemTotal.toFixed(2)}
                </Text>
              </Box>
            </Box>
          );
        })
      )}

      {/* Pricing Summary */}
      {cart.length > 0 ? (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Box justifyContent="space-between">
            <Text color="gray">Subtotal:</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </Box>
          <Box justifyContent="space-between">
            <Text color="gray">Estimated Tax (7%):</Text>
            <Text>${tax.toFixed(2)}</Text>
          </Box>
          <Box justifyContent="space-between">
            <Text bold color="white">Grand Total:</Text>
            <Text bold color="green">${total.toFixed(2)}</Text>
          </Box>
        </Box>
      ) : null}

      {/* Cart Actions */}
      <Box justifyContent="space-between" marginTop={1} paddingX={1}>
        <Box gap={1}>
          <Text color="yellow">[↑/↓]</Text><Text color="gray">Select</Text>
          <Text color="yellow">[+]</Text><Text color="gray">Inc</Text>
          <Text color="yellow">[-]</Text><Text color="gray">Dec</Text>
          <Text color="yellow">[R]</Text><Text color="gray">Remove</Text>
          <Text color="yellow">[E]</Text><Text color="gray">Edit Name</Text>
        </Box>
        {cart.length > 0 ? (
          <Box borderStyle="round" borderColor="green" paddingX={1}>
            <Text bold color="green">[C] Complete Checkout</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
