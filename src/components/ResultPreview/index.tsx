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
      <Title level={2}>Conversion Completed!</Title>
      
      <div style={{ margin: '30px 0' }}>
        <Image 
          width={400} 
          src={result.previewImgUrl} 
          alt="Result Preview"
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
          Download .DXF
        </Button>
        <Button size="large" icon={<RedoOutlined />} onClick={reset}>
          Process Another
        </Button>
      </Space>
    </div>
  );
};
