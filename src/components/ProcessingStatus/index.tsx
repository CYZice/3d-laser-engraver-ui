import React from 'react';
import { Progress, Typography } from 'antd';
import { usePolling } from '@/hooks/usePolling';
import { useAppStore } from '@/store/useAppStore';

const { Title, Text } = Typography;

export const ProcessingStatus: React.FC = () => {
  const { progress } = useAppStore();
  usePolling(); // Start polling

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <Title level={3}>Processing Image...</Title>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Progress percent={progress} status="active" />
        <div style={{ marginTop: '20px' }}>
            <Text type="secondary">
                {progress < 30 ? 'Uploading...' : 
                 progress < 60 ? 'Analyzing contours...' : 
                 progress < 90 ? 'Generating DXF...' : 'Finalizing...'}
            </Text>
        </div>
      </div>
    </div>
  );
};
