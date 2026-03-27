import React from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAppStore } from '@/store/useAppStore';

const { Dragger } = Upload;

export const ImageUploader: React.FC = () => {
  const setFile = useAppStore((s) => s.setFile);

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error('仅支持上传 JPG/PNG 图片');
        return Upload.LIST_IGNORE;
      }
      const isLt20M = file.size / 1024 / 1024 < 20;
      if (!isLt20M) {
        message.error('图片大小不能超过 20MB');
        return Upload.LIST_IGNORE;
      }
      
      // Pass validation, set file to store
      setFile(file);
      return false; // Prevent auto upload
    },
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Dragger {...props} style={{ padding: '40px 0', background: '#fff' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
        <p className="ant-upload-hint">
          支持单张上传，请勿上传敏感信息或受限内容。
        </p>
      </Dragger>
    </div>
  );
};
