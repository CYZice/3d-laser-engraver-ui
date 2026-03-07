import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';

interface PaymentMockProps {
  onPaymentSuccess: () => void;
  amount: number;
}

export const PaymentMock: React.FC<PaymentMockProps> = ({ onPaymentSuccess, amount }) => {
  const [status, setStatus] = useState<'pending' | 'success'>('pending');

  useEffect(() => {
    // Simulate payment processing
    const timer = setTimeout(() => {
      setStatus('success');
      // Wait a bit more to show success message before moving on
      setTimeout(onPaymentSuccess, 2000);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onPaymentSuccess]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div className="glass-panel" style={{
        padding: '40px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '500px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Decoration */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, transparent, var(--primary-cyan), transparent)'
        }} />

        <h2 className="glow-text" style={{ margin: '0 0 20px 0', color: '#fff', letterSpacing: '2px' }}>
          {status === 'pending' ? 'SECURE PAYMENT' : 'TRANSACTION COMPLETE'}
        </h2>

        <div style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'var(--primary-cyan)',
          marginBottom: '30px',
          fontFamily: 'monospace',
          textShadow: '0 0 20px rgba(0,255,255,0.3)'
        }}>
          ¥ {amount.toFixed(2)}
        </div>

        <div style={{
          position: 'relative',
          width: 280,
          height: 280,
          margin: '0 auto 30px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '10px'
        }}>
          {status === 'pending' ? (
            <>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '5px' }}>
                <QRCodeSVG value={`https://mock-payment.com/pay?amount=${amount}`} size={240} />
              </div>

              {/* Scan Line Animation */}
              <motion.div
                animate={{ top: [0, 280, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{
                  position: 'absolute',
                  left: 0,
                  width: '100%',
                  height: '2px',
                  background: 'var(--primary-cyan)',
                  boxShadow: '0 0 15px var(--primary-cyan)',
                  zIndex: 10
                }}
              />
            </>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <CheckCircle size={150} color="#52c41a" style={{ filter: 'drop-shadow(0 0 20px #52c41a)' }} />
            </motion.div>
          )}
        </div>

        {status === 'pending' && (
          <div style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'monospace'
          }}>
            <Loader2 className="animate-spin" color="var(--primary-cyan)" />
            <span>WAITING FOR SIGNAL...</span>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '20px',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.8rem',
        letterSpacing: '1px'
      }}>
        ENCRYPTED CONNECTION ESTABLISHED
      </div>
    </div>
  );
};
