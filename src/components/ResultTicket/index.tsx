import { motion } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CrystalViewer } from '../CrystalViewer';

interface ResultTicketProps {
  orderId: string;
  onDone: () => void;
  // 防御性：增加 3D 渲染所需的上游传参
  dxfUrl?: string;
  fallbackImgUrl?: string;
}

export const ResultTicket: React.FC<ResultTicketProps> = ({
  orderId,
  onDone,
  dxfUrl = '',
  fallbackImgUrl = ''
}) => {
  const [showTicket, setShowTicket] = useState(false);
  const [countdown, setCountdown] = useState(15); // 给足取单时间

  useEffect(() => {
    // 只有当弹出了提单卡片，才开始倒计时
    if (showTicket) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        onDone();
      }
    }
  }, [countdown, showTicket, onDone]);

  // 原有业务逻辑不变，将样式改为绝对定位悬浮层 (HUD Overlay)，
  // 底层留给 CrystalViewer 给画布全权接管
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000' // Base background before 3d canvas loads
    }}>

      {/* 3D 水晶检视器 (绝对背景) */}
      <CrystalViewer
        zIndex={1}
        dxfUrl={dxfUrl}
        fallbackImgUrl={fallbackImgUrl}
      />

      {/* 步骤一：检视引导与确认按钮 */}
      {!showTicket && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            position: 'absolute',
            bottom: '5%',
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            pointerEvents: 'none', // 让容器穿透事件，保证空隙处还能拖拽 3D 水晶
            width: '100%'
          }}
        >
          <div style={{
            color: '#555',
            fontSize: '1rem',
            letterSpacing: '2px',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            marginBottom: '5px'
          }}>
            ← 拖拽屏幕以全方位检视您的水晶内雕 →
          </div>

          <button
            onClick={() => setShowTicket(true)}
            style={{
              pointerEvents: 'auto', // 按钮本身需拦截点击
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#111',
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '16px 48px',
              borderRadius: '40px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            完成检视并提取订单
          </button>
        </motion.div>
      )}

      {/* 步骤二：悬浮数据层 HUD Overlay (保留原有元素，改为毛玻璃) */}
      {showTicket && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }} // 稍作延迟等待场景初次挂载
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(16px)', // 毛玻璃效果
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: '#333',
            padding: '40px',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            width: '90%',
            maxWidth: '500px',
            textAlign: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Ticket Holes (颜色相应调淡以适配玻璃感) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: -20,
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.3)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            right: -20,
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.3)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
            borderRadius: '50%'
          }} />

          <CheckCircle size={60} color="#52c41a" style={{ marginBottom: 15 }} />

          <h1 style={{ margin: 0, fontSize: '2rem' }}>Order Submitted!</h1>
          <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: 30, marginTop: 10 }}>
            Please collect your ticket at the counter.
          </p>

          <div style={{
            border: '2px dashed rgba(0, 0, 0, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.4)',
            marginBottom: 30
          }}>
            <div style={{ fontSize: '1rem', color: '#666', textTransform: 'uppercase' }}>Your Order ID</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', letterSpacing: '3px', color: '#222' }}>
              #{orderId}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#555' }}>
            <Clock size={20} />
            <span>Returning to home in {countdown}s</span>
          </div>

          <button
            onClick={onDone}
            style={{
              marginTop: 25,
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              padding: '12px 30px',
              borderRadius: '30px',
              cursor: 'pointer',
              color: '#333',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            Return Now
          </button>
        </motion.div>
      )}
    </div>
  );
};
