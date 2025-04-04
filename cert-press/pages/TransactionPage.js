import React, { useState, useEffect } from 'react';
import MobileWalletLink from '../components/MobileWalletLink';

const TransactionPage = ({ contractAddress = '0x1234567890123456789012345678901234567890', transactionData = '0x' }) => {
  // ...existing code...

  return (
    <div className="main-content">
      <div className="">
        <div className="page-title-container">
          <h1 className="page-title" style={{ fontSize: '2.75rem', marginBottom: '1.5rem' }}>
            <i className="fas fa-mobile-alt"></i> Tranzacție Portofel Mobil
          </h1>
        </div>
        
        <div className="article-form" style={{ padding: '3rem', width: '150%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '4rem' }}>
            <div>
              <div className="form-section">
                <h2 className="form-section-title">
                  <i className="fas fa-info-circle"></i> Instrucțiuni
                </h2>
                
                <div style={{
                  backgroundColor: 'var(--primary-lighter)', 
                  padding: '1.75rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{marginBottom: '0.75rem', fontWeight: '600', fontSize: '1.2rem'}}>
                    Cum să folosiți această pagină:
                  </h4>
                  <ol style={{paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '1.05rem'}}>
                    <li style={{marginBottom: '0.5rem'}}>Introduceți o adresă Ethereum validă în câmpul Adresă Destinatar</li>
                    <li style={{marginBottom: '0.5rem'}}>Apăsați butonul "Generează Link Ethereum"</li>
                    <li style={{marginBottom: '0.5rem'}}>Copiați linkul generat</li>
                    <li style={{marginBottom: '0.5rem'}}>Deschideți linkul în aplicația portofelului mobil (MetaMask Mobile, Trust Wallet, etc.)</li>
                    <li>Semnați tranzacția în portofelul mobil</li>
                  </ol>
                </div>
              </div>
              
              <div className="form-section">
                <h2 className="form-section-title">
                  <i className="fas fa-file-contract"></i> Detalii Tranzacție
                </h2>
                
                <div className="meta-info">
                  <div className="meta-info-header">
                    <h3 className="meta-info-title">Informații Contract</h3>
                  </div>
                  <div className="meta-info-content">
                    <div className="meta-info-item">
                      <div className="meta-info-label">Adresă Contract</div>
                      <div className="meta-info-value">
                        <code>{contractAddress}</code>
                      </div>
                    </div>
                    <div className="meta-info-item">
                      <div className="meta-info-label">Date Tranzacție</div>
                      <div className="meta-info-value">
                        <code style={{fontSize: '0.8rem', wordBreak: 'break-all'}}>
                          {transactionData.length > 66 
                            ? `${transactionData.substring(0, 42)}...${transactionData.substring(transactionData.length - 24)}`
                            : transactionData}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <MobileWalletLink 
                toAddress={contractAddress} 
                value="0" 
                data={transactionData}
                recipientAddress={recipientAddress}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;