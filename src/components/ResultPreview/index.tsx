import React from 'react';
import { Button, Image, Space, Typography } from 'antd';
import { DownloadOutlined, RedoOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';

const { Title } = Typography;

export const ResultPreview: React.FC = () => {
  const { result, reset } = useAppStore();

  if (!result) return null;

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <Title level={2} style={{ marginBottom: 0 }}>转换完成</Title>
        <div style={{ fontSize: '0.85rem', color: '#888', letterSpacing: '2px' }}>CONVERSION COMPLETED</div>
      </div>
      
      <div style={{ margin: '30px 0' }}>
        <Image 
          width={400} 
          src={result.previewImgUrl} 
          alt="结果预览"
          style={{ border: '1px solid #ddd', borderRadius: '8px' }}
        />
      </div>

      <Space size="large">
        <Button 
            type="primary" 
            size="large" 
            icon={<DownloadOutlined />} 
            href={result.dxfUrl} 
            target="_blank"
        >
          下载 .DXF
        </Button>
        <Button size="large" icon={<RedoOutlined />} onClick={reset}>
          再处理一张
        </Button>
      </Space>
    </div>
  );
};
