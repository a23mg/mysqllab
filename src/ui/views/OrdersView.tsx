import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DatabaseAdapter, Order } from '../../types/index.ts';

export interface OrdersViewProps {
  db: DatabaseAdapter;
  setStatus: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isActive: boolean;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  db,
  setStatus,
  isActive
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadOrders = useCallback(async () => {
    try {
      const list = await db.getOrders();
      setOrders(list);
      if (selectedIndex >= list.length) {
        setSelectedIndex(Math.max(0, list.length - 1));
      }
    } catch (err: any) {
      setStatus(`Failed to fetch orders: ${err.message}`, 'error');
    }
  }, [db, selectedIndex, setStatus]);

  useEffect(() => {
    if (!isActive) return;
    loadOrders();
  }, [isActive, loadOrders]);

  useInput((input, key) => {
    if (!isActive) return;
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(orders.length - 1, prev + 1));
    }
  });

  const selectedOrder = orders[selectedIndex];

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold color="cyan">Order History & Sales Record</Text>
        <Text color="yellow">{orders.length} total orders placed</Text>
      </Box>

      {/* Orders Table */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Box width="10%"><Text bold color="blue">Order #</Text></Box>
        <Box width="30%"><Text bold color="blue">Customer</Text></Box>
        <Box width="15%"><Text bold color="blue">Items</Text></Box>
        <Box width="20%"><Text bold color="blue">Total Paid</Text></Box>
        <Box width="25%"><Text bold color="blue">Date</Text></Box>
      </Box>

      {orders.length === 0 ? (
        <Box padding={2} justifyContent="center">
          <Text color="gray">No orders placed yet. Add items to cart and checkout in Tab 3!</Text>
        </Box>
      ) : (
        orders.map((ord, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box key={ord.id} paddingX={1} backgroundColor={isSelected ? 'gray' : undefined}>
              <Box width="10%"><Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>#{ord.id}</Text></Box>
              <Box width="30%"><Text bold={isSelected} color={isSelected ? 'white' : undefined}>{ord.customerName}</Text></Box>
              <Box width="15%"><Text color="yellow">{ord.totalItems} pcs</Text></Box>
              <Box width="20%"><Text bold color="green">${ord.totalAmount.toFixed(2)}</Text></Box>
              <Box width="25%"><Text color="gray">{ord.createdAt?.substring(0, 19)}</Text></Box>
            </Box>
          );
        })
      )}

      {/* Line Items for Selected Order */}
      {selectedOrder ? (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
          <Text bold color="cyan">
            📦 Order #{selectedOrder.id} Items Breakdown ({selectedOrder.customerName})
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {selectedOrder.items.map((it, idx) => (
              <Box key={idx} justifyContent="space-between">
                <Text>• {it.productTitle}</Text>
                <Text color="yellow">
                  {it.quantity}x @ ${it.price.toFixed(2)} = <Text bold color="green">${it.total.toFixed(2)}</Text>
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      <Box marginTop={1} paddingX={1}>
        <Text color="yellow">[↑/↓] </Text><Text color="gray">Navigate through orders</Text>
      </Box>
    </Box>
  );
};
