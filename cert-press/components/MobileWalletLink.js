import React, { useState, useEffect } from 'react';
import { 
  generateEthereumLink, 
  isValidEthereumAddress,
  formatValueAsWei 
} from '../services/walletService';
import { encodeWithAddress, addRecipientToSchema } from '../services/schemaEncoder';

const MobileWalletLink = ({ toAddress, value, data, recipientAddress: propRecipientAddress }) => {
  const [recipientAddress, setRecipientAddress] = useState(propRecipientAddress || '');
  const [ethLink, setEthLink] = useState('');
  const [addressError, setAddressError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (recipientAddress && !isValidEthereumAddress(recipientAddress)) {
      setAddressError('Adresă Ethereum invalidă');
    } else {
      setAddressError('');
    }
  }, [recipientAddress]);

  const generateLink = () => {
    if (!recipientAddress || addressError) return;

    const link = generateEthereumLink({
      to: recipientAddress,
      value: formatValueAsWei(value),
      data: encodeWithAddress(data, recipientAddress)
    });

    setEthLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ethLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mobile-wallet-link" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 className="form-section-title" style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>
        <i className="fas fa-mobile-alt"></i> Generator Link Portofel Mobil
      </h3>
      
      <div className="form-group">
        <label htmlFor="recipientAddress" className="form-label" style={{ fontSize: '1.1rem' }}>Adresă Destinatar</label>
        <input 
          type="text" 
          id="recipientAddress"
          className="form-input"
          placeholder="Introduceți o adresă Ethereum" 
          value={recipientAddress} 
          onChange={(e) => setRecipientAddress(e.target.value)}
          style={{ padding: '0.9rem 1.2rem', fontSize: '1rem' }}
        />
        {addressError && <div style={{color: "var(--danger)", fontSize: "0.9rem", marginTop: "0.75rem"}}>{addressError}</div>}
      </div>
      
      <button 
        className="button button-primary"
        onClick={generateLink}
        disabled={recipientAddress && addressError}
        style={{ padding: '0.9rem 1.2rem', fontSize: '1.05rem', marginBottom: '2rem' }}
      >
        <i className="fas fa-link"></i> Generează Link Ethereum
      </button>
      
      {ethLink && (
        <div className="attestation-info" style={{marginTop: "1rem", flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
          <h3 className="attestation-title" style={{ fontSize: '1.2rem' }}>
            <i className="fas fa-check-circle"></i> Link Generat
          </h3>
          
          <p className="form-input-note" style={{marginBottom: "1.5rem", fontSize: '0.95rem'}}>
            Copiați acest link în aplicația portofelului mobil sau folosiți butonul de deschidere directă:
          </p>
          
          <div style={{display: "flex", gap: "0.75rem", marginBottom: "1.5rem"}}>
            <input 
              type="text" 
              className="form-input" 
              value={ethLink} 
              readOnly 
              style={{flex: "1", padding: '0.9rem 1.2rem', fontSize: '0.95rem'}}
            />
            <button 
              className="button button-outline"
              onClick={copyToClipboard}
              style={{whiteSpace: "nowrap", padding: '0 1.5rem'}}
            >
              {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
              {copied ? ' Copiat!' : ' Copiază'}
            </button>
          </div>
          
          <div style={{textAlign: "center", marginTop: 'auto', paddingTop: '1.5rem'}}>
            <a href={ethLink} className="button button-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
              <i className="fas fa-external-link-alt"></i> Deschide în Portofel
            </a>
            <p className="form-input-note" style={{marginTop: "1.25rem", fontSize: '0.95rem'}}>
              Aceasta va deschide aplicația de portofel crypto implicită, dacă este instalată.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileWalletLink;