import { ImageEditor } from '@/components/ImageEditor';
import { ImageUploader } from '@/components/ImageUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultPreview } from '@/components/ResultPreview';
import { useAppStore } from '@/store/useAppStore';
import { Layout } from 'antd';

const { Header, Content, Footer } = Layout;

function App() {
  const step = useAppStore((s) => s.step);

  const renderContent = () => {
    switch (step) {
      case 'UPLOAD': return <ImageUploader />;
      case 'EDIT': return <ImageEditor />;
      case 'PROCESSING': return <ProcessingStatus />;
      case 'RESULT': return <ResultPreview />;
      default: return <ImageUploader />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
          3D Laser Engraving - Image to DXF
        </div>
      </Header>
      <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '1000px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {renderContent()}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        3D Laser Engraving Tool ©{new Date().getFullYear()} Created by Trae AI
      </Footer>
    </Layout>
  );
}

export default App;
