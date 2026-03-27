import React from 'react';
import { motion } from 'framer-motion';

interface AttractScreenProps {
  onStart: () => void;
}

export const AttractScreen: React.FC<AttractScreenProps> = ({ onStart }) => {
  return (
    <div 
      onClick={onStart}
      style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Background Effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at center, rgba(0,255,255,0.1) 0%, transparent 70%)',
        zIndex: 0
      }} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: "easeInOut" }}
        style={{ zIndex: 1, textAlign: 'center' }}
      >
        <h1 style={{
          fontSize: '5rem',
          margin: 0,
          background: 'linear-gradient(to right, #fff, #00ffff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(0,255,255,0.3)'
        }}>
          3D 激光内雕
        </h1>
        <div style={{ fontSize: '1.1rem', letterSpacing: '4px', opacity: 0.85, marginTop: '8px' }}>
          3D LASER ENGRAVING
        </div>
        <h2 style={{
          fontSize: '3rem',
          margin: '14px 0 6px',
          fontWeight: 300,
          letterSpacing: '5px'
        }}>
          水晶定制
        </h2>
        <div style={{ fontSize: '0.95rem', letterSpacing: '3px', opacity: 0.8 }}>
          CRYSTAL CUSTOMIZATION
        </div>
      </motion.div>
      
      <motion.div
        animate={{ 
          y: [0, 10, 0],
          opacity: [0.6, 1, 0.6] 
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ 
          marginTop: '80px', 
          zIndex: 1,
          border: '2px solid rgba(255,255,255,0.3)',
          padding: '15px 40px',
          borderRadius: '50px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(5px)'
        }}
      >
        <span style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>轻触开始</span>
      </motion.div>

      {/* Footer info */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontSize: '0.9rem',
        opacity: 0.4,
        zIndex: 1
      }}>
        高端水晶内雕定制服务
      </div>
    </div>
  );
};
