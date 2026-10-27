import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DatabaseAdapter } from '../../types/index.ts';
import { seedFromDummyJson } from '../../db/seeder.ts';

export interface SeederViewProps {
  db: DatabaseAdapter;
  setStatus: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isActive: boolean;
}

export const SeederView: React.FC<SeederViewProps> = ({
  db,
  setStatus,
  isActive
}) => {
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [limit, setLimit] = useState(100);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLogs, setSeedLogs] = useState<string[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const prods = await db.getProducts({ limit: 1 });
      setProductCount(prods.total);
      const orders = await db.getOrders();
      setOrderCount(orders.length);
      const cats = await db.getCategories();
      setCategories(cats);
    } catch (err: any) {
      setStatus(`Failed to read stats: ${err.message}`, 'error');
    }
  }, [db, setStatus]);

  useEffect(() => {
    if (!isActive) return;
    loadStats();
  }, [isActive, loadStats]);

  const handleSeed = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setSeedLogs([`Starting seed with limit=${limit}...`]);
    try {
      const res = await seedFromDummyJson(db, limit, (msg) => {
        setSeedLogs(prev => [...prev.slice(-4), msg]);
      });
      setStatus(`Seeded ${res.totalSeeded} products in ${res.durationMs}ms!`, 'success');
      await loadStats();
    } catch (err: any) {
      setStatus(`Seeding failed: ${err.message}`, 'error');
      setSeedLogs(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsSeeding(false);
    }
  };

  useInput((input, key) => {
    if (!isActive || isSeeding) return;

    if (input === 's' || input === 'S' || key.return) {
      handleSeed();
    } else if (input === '1') {
      setLimit(30);
    } else if (input === '2') {
      setLimit(50);
    } else if (input === '3') {
      setLimit(100);
    }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" padding={1} flexDirection="column">
        <Text bold color="cyan">💾 DATABASE & SEEDER CONTROL CENTER</Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Text><Text bold>Database Type: </Text><Text color="yellow">{db.type.toUpperCase()}</Text></Text>
          <Text><Text bold>Connection: </Text><Text color="white">{db.connectionInfo}</Text></Text>
          <Text><Text bold>Total Products: </Text><Text bold color="green">{productCount}</Text></Text>
          <Text><Text bold>Total Categories: </Text><Text bold color="green">{categories.length}</Text> ({categories.slice(0, 5).join(', ')}{categories.length > 5 ? '...' : ''})</Text>
          <Text><Text bold>Total Orders Placed: </Text><Text bold color="green">{orderCount}</Text></Text>
        </Box>
      </Box>

      {/* Seeding Box */}
      <Box marginTop={1} borderStyle="round" borderColor="yellow" padding={1} flexDirection="column">
        <Text bold color="yellow">🌱 Seed Products from DummyJSON (https://dummyjson.com/products)</Text>
        <Box marginY={1}>
          <Text>
            Choose seed quantity:
            {' '}
            <Text bold color={limit === 30 ? 'green' : 'gray'}>[1] 30 items</Text>
            {' | '}
            <Text bold color={limit === 50 ? 'green' : 'gray'}>[2] 50 items</Text>
            {' | '}
            <Text bold color={limit === 100 ? 'green' : 'gray'}>[3] 100 items</Text>
          </Text>
        </Box>

        <Box gap={2}>
          <Box borderStyle="round" borderColor={isSeeding ? 'gray' : 'green'} paddingX={1}>
            <Text bold color={isSeeding ? 'gray' : 'green'}>
              {isSeeding ? '⏳ Seeding in progress...' : '🚀 [S / Enter] Fetch & Seed Now'}
            </Text>
          </Box>
        </Box>

        {seedLogs.length > 0 ? (
          <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
            <Text bold color="gray">Live Logs:</Text>
            {seedLogs.map((log, idx) => (
              <Text key={idx} color="cyan">
                › {log}
              </Text>
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
