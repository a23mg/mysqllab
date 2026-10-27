import React from 'react';
import { Box, Text } from 'ink';

export interface FooterProps {
  statusMessage?: string;
  statusType?: 'info' | 'success' | 'error';
  customHints?: string;
}

export const Footer: React.FC<FooterProps> = ({
  statusMessage,
  statusType = 'info',
  customHints
}) => {
  const getStatusColor = () => {
    switch (statusType) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'cyan';
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Alert / Notification Bar if any */}
      {statusMessage ? (
        <Box borderStyle="single" borderColor={getStatusColor()} paddingX={1} marginBottom={0}>
          <Text bold color={getStatusColor()}>
            ℹ️  {statusMessage}
          </Text>
        </Box>
      ) : null}

      {/* Shortcuts */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text color="yellow">[1-5]</Text>
          <Text color="gray">Switch Tabs</Text>
          <Text color="gray">|</Text>
          <Text color="yellow">[Tab]</Text>
          <Text color="gray">Switch Focus</Text>
          {customHints ? (
            <>
              <Text color="gray">|</Text>
              <Text color="cyan">{customHints}</Text>
            </>
          ) : null}
        </Box>
        <Box>
          <Text color="yellow">[q/Ctrl+C]</Text>
          <Text color="gray"> Quit</Text>
        </Box>
      </Box>
    </Box>
  );
};
