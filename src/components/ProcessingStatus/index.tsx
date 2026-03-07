import { usePolling } from '@/hooks/usePolling';
import { useAppStore } from '@/store/useAppStore';
import { Progress, Typography } from 'antd';
import React from 'react';

const { Title, Text } = Typography;

export const ProcessingStatus: React.FC = () => {
  const { progress } = useAppStore();
  usePolling(); // Start polling

  return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '50px', width: '100%', maxWidth: '500px' }}>
      <h2 className="glow-text" style={{ color: '#fff', marginBottom: '30px' }}>
        PROCESSING IMAGE...
      </h2>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Progress
          percent={progress}
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#00ffff',
          }}
          trailColor="rgba(255,255,255,0.1)"
        />
        <div style={{ marginTop: '30px', fontFamily: 'monospace', color: 'var(--primary-cyan)' }}>
          {progress < 30 ? '>> UPLOADING_DATA' :
            progress < 60 ? '>> ANALYZING_CONTOURS' :
              progress < 90 ? '>> GENERATING_DXF' : '>> FINALIZING_OUTPUT'}
        </div>
      </div>
    </div>
  );
};
