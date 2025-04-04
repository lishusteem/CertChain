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
      setAddressError('Invalid Ethereum address');
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
    <div className="mobile-wallet-link">
      <h3 className="form-section-title">
        <i className="fas fa-mobile-alt"></i> Mobile Wallet Link Generator
      </h3>
      
      <div className="form-group">
        <label htmlFor="recipientAddress" className="form-label">Recipient Address</label>
        <input 
          type="text" 
          id="recipientAddress"
          className="form-input"
          placeholder="Enter Ethereum Address" 
          value={recipientAddress} 
          onChange={(e) => setRecipientAddress(e.target.value)}
        />
        {addressError && <div style={{color: "var(--danger)", fontSize: "0.875rem", marginTop: "0.5rem"}}>{addressError}</div>}
      </div>
      
      <button 
        className="button button-primary"
        onClick={generateLink}
        disabled={recipientAddress && addressError}
      >
        <i className="fas fa-link"></i> Generate Ethereum Link
      </button>
      
      {ethLink && (
        <div className="attestation-info" style={{marginTop: "1.5rem"}}>
          <h3 className="attestation-title">
            <i className="fas fa-check-circle"></i> Link Generated
          </h3>
          
          <p className="form-input-note" style={{marginBottom: "1rem"}}>
            Copy this link to your mobile wallet app or use the direct open button:
          </p>
          
          <div style={{display: "flex", gap: "0.5rem", marginBottom: "1rem"}}>
            <input 
              type="text" 
              className="form-input" 
              value={ethLink} 
              readOnly 
              style={{flex: "1"}}
            />
            <button 
              className="button button-outline"
              onClick={copyToClipboard}
              style={{whiteSpace: "nowrap"}}
            >
              {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
              {copied ? ' Copied!' : ' Copy'}
            </button>
          </div>
          
          <div style={{textAlign: "center"}}>
            <a href={ethLink} className="button button-primary">
              <i className="fas fa-external-link-alt"></i> Open in Wallet
            </a>
            <p className="form-input-note" style={{marginTop: "1rem"}}>
              This will open your default crypto wallet application if installed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileWalletLink;