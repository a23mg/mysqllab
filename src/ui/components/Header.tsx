import React from 'react';
import { Box, Text } from 'ink';

export interface HeaderProps {
  activeTab: number;
  connectionInfo: string;
  cartItemCount: number;
  cartTotal: number;
}

const TABS = [
  { id: 1, label: '1: 📦 Products' },
  { id: 2, label: '2: ⚙️ Manage CRUD' },
  { id: 3, label: '3: 🛒 Cart & Checkout' },
  { id: 4, label: '4: 📋 Orders' },
  { id: 5, label: '5: 🔄 Seeder / DB' }
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  connectionInfo,
  cartItemCount,
  cartTotal
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top Banner */}
      <Box
        justifyContent="space-between"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Box>
          <Text bold color="cyan">
            🛍️  MYSQLLAB E-COMMERCE
          </Text>
          <Text color="gray"> | Terminal Edition</Text>
        </Box>
        <Box>
          <Text color="magenta">💾 {connectionInfo} </Text>
          <Text color="yellow" bold>
            | 🛒 {cartItemCount} item{cartItemCount === 1 ? '' : 's'} (${cartTotal.toFixed(2)})
          </Text>
        </Box>
      </Box>

      {/* Tabs */}
      <Box marginTop={1} gap={1}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Box
              key={tab.id}
              borderStyle="round"
              borderColor={isActive ? 'green' : 'gray'}
              paddingX={1}
            >
              <Text bold={isActive} color={isActive ? 'green' : 'gray'}>
                {tab.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
