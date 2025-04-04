import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const QRCodeModal = ({ uri, isOpen, onClose, title = "Scanează cu portofelul mobil" }) => {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && uri && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, uri, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [uri, isOpen]);

  const copyToClipboard = () => {
    if (uri) {
      navigator.clipboard.writeText(uri).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <h3 className="modal-title">{title}</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="qr-container" style={{
            padding: '1rem',
            backgroundColor: 'white',
            marginBottom: '1.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow)',
          }}>
            <canvas ref={canvasRef} />
          </div>
          
          {/* WalletConnect URI for copying */}
          <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <p style={{
              textAlign: 'center',
              marginBottom: '0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}>
              Link WalletConnect:
            </p>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              width: '100%'
            }}>
              <input 
                type="text" 
                value={uri || ''} 
                readOnly 
                style={{
                  flex: '1',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--background-alt)',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                  backgroundColor: copied ? 'var(--secondary)' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                {copied ? (
                  <><i className="fas fa-check"></i> Copiat</>
                ) : (
                  <><i className="fas fa-copy"></i> Copiază</>
                )}
              </button>
            </div>
          </div>
          
          <p style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: 'var(--text-secondary)',
          }}>
            Scanează codul QR sau copiază link-ul în aplicația portofelului tău pentru a conecta
          </p>
          
          <div style={{ 
            backgroundColor: 'var(--background-alt)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            width: '100%',
          }}>
            <h4 style={{ marginBottom: '0.75rem' }}>Instrucțiuni:</h4>
            <ol style={{ paddingLeft: '1.5rem' }}>
              <li>Deschide aplicația portofelului tău (MetaMask, Trust Wallet, etc.)</li>
              <li>Selectează opțiunea de scanare QR sau WalletConnect</li>
              <li>Scanează codul QR sau lipește link-ul copiat</li>
              <li>Aprobă conexiunea în portofelul tău</li>
            </ol>
          </div>
          
          <button 
            className="button button-outline"
            onClick={onClose}
            style={{ marginTop: '1rem' }}
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
