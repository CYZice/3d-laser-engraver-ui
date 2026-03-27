import { usePolling } from '@/hooks/usePolling';
import { useAppStore } from '@/store/useAppStore';
import { Progress } from 'antd';
import React from 'react';

// Removed unused destructured elements

export const ProcessingStatus: React.FC = () => {
  const { progress } = useAppStore();
  usePolling(); // Start polling

  return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '50px', width: '100%', maxWidth: '500px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 className="glow-text" style={{ color: '#fff', margin: 0 }}>
          图像处理中...
        </h2>
        <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)', letterSpacing: '2px', fontSize: '0.85rem' }}>
          IMAGE PROCESSING
        </div>
      </div>
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
          {progress < 30 ? '>> 正在上传数据' :
            progress < 60 ? '>> 正在分析轮廓' :
              progress < 90 ? '>> 正在生成 DXF' : '>> 正在完成输出'}
        </div>
      </div>
    </div>
  );
};
