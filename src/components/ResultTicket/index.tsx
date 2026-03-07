import { motion } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ResultTicketProps {
  orderId: string;
  onDone: () => void;
}

export const ResultTicket: React.FC<ResultTicketProps> = ({ orderId, onDone }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onDone();
    }
  }, [countdown, onDone]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      padding: 20
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'white',
          color: '#333',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '600px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ticket Holes */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: -20,
          width: 40,
          height: 40,
          background: '#49aa19',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          right: -20,
          width: 40,
          height: 40,
          background: '#49aa19',
          borderRadius: '50%'
        }} />

        <CheckCircle size={80} color="#52c41a" style={{ marginBottom: 20 }} />

        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Order Submitted!</h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: 40 }}>
          Please collect your ticket at the counter.
        </p>

        <div style={{
          border: '2px dashed #ddd',
          padding: '20px',
          borderRadius: '10px',
          background: '#f9f9f9',
          marginBottom: 30
        }}>
          <div style={{ fontSize: '1rem', color: '#999', textTransform: 'uppercase' }}>Your Order ID</div>
          <div style={{ fontSize: '4rem', fontWeight: 'bold', letterSpacing: '5px', color: '#333' }}>
            #{orderId}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#999' }}>
          <Clock size={20} />
          <span>Returning to home in {countdown}s</span>
        </div>

        <button
          onClick={onDone}
          style={{
            marginTop: 30,
            background: 'transparent',
            border: '1px solid #ddd',
            padding: '10px 30px',
            borderRadius: '20px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          Return Now
        </button>
      </motion.div>
    </div>
  );
};
