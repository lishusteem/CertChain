import { BrowserProvider } from 'ethers';

/**
 * Checks if MetaMask is installed in the browser
 * @returns {boolean} - True if MetaMask is installed, false otherwise
 */
export const isMetaMaskInstalled = () => {
  return window.ethereum !== undefined;
};

/**
 * Requests connection to MetaMask
 * @returns {Promise<{provider: BrowserProvider, signer: Signer, address: string}>} - The connected wallet info
 */
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  try {
    // Request account access from MetaMask
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create an ethers provider
    const provider = new BrowserProvider(window.ethereum);
    
    // Get the signer
    const signer = await provider.getSigner();
    
    // Get the connected address
    const address = await signer.getAddress();
    
    return { provider, signer, address };
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    throw new Error(`Error connecting to MetaMask: ${error.message}`);
  }
};

/**
 * Checks if the connected network is Sepolia
 * @param {BrowserProvider} provider - An ethers.js provider
 * @returns {Promise<boolean>} - True if on Sepolia network, false otherwise
 */
export const isSepoliaNetwork = async (provider) => {
  if (!provider) return false;
  
  try {
    const network = await provider.getNetwork();
    // Sepolia chain ID is 11155111
    return network.chainId === 11155111n;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

/**
 * Switches the MetaMask network to Sepolia
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const switchToSepoliaNetwork = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
    });
    return true;
  } catch (error) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Sepolia network:", addError);
        return false;
      }
    }
    console.error("Error switching to Sepolia network:", error);
    return false;
  }
};

/**
 * Formats a long Ethereum address to a shortened display version
 * @param {string} address - The full Ethereum address
 * @returns {string} - The truncated address (e.g., 0x1234...5678)
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Servicii pentru interacțiunea cu wallet-uri Ethereum
 */

/**
 * Verifică dacă o adresă Ethereum este validă
 * @param {string} address - Adresa Ethereum de verificat
 * @returns {boolean} - True dacă adresa este validă
 */
export const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Formatează o valoare ca Wei pentru tranzacții Ethereum
 * @param {string|number} value - Valoarea în Ether
 * @returns {string} - Valoarea în Wei ca string hex
 */
export const formatValueAsWei = (value) => {
  // Considerăm 0 ca valoare implicită
  if (!value || value === '0') return '0x0';
  
  try {
    // Convertim la BigInt și apoi la hex
    const valueInWei = BigInt(Math.floor(parseFloat(value) * 1e18));
    return '0x' + valueInWei.toString(16);
  } catch (error) {
    console.error('Eroare la conversia valorii în Wei:', error);
    return '0x0';
  }
};

/**
 * Generează un link Ethereum pentru wallet-uri mobile
 * @param {Object} params - Parametrii pentru link
 * @param {string} params.to - Adresa destinatar
 * @param {string} params.value - Valoarea tranzacției (în Wei, format hex)
 * @param {string} params.data - Date tranzacție (format hex)
 * @returns {string} - Link Ethereum generat
 */
export const generateEthereumLink = ({ to, value = '0x0', data = '0x' }) => {
  if (!isValidEthereumAddress(to)) {
    throw new Error('Adresă Ethereum invalidă');
  }
  
  // Format: ethereum:<address>@<chainId>?value=<value>&data=<data>
  const chainId = '11155111'; // Sepolia testnet
  const params = new URLSearchParams();
  
  // Adăugăm parametrii doar dacă au valori
  if (value && value !== '0x0') {
    params.append('value', value);
  }
  
  if (data && data !== '0x') {
    params.append('data', data);
  }
  
  const paramString = params.toString() ? `?${params.toString()}` : '';
  return `ethereum:${to}@${chainId}${paramString}`;
};

/**
 * Generează un link Ethereum pentru atestări EAS
 * @param {Object} attestationData - Date pentru atestare 
 * @param {string} schemaUID - UID-ul schemei EAS
 * @param {string} contractAddress - Adresa contractului EAS
 * @returns {string} - Link Ethereum generat pentru atestare
 */
export const generateEASAttestationLink = (attestationData, schemaUID, contractAddress) => {
  // În implementarea reală, aici s-ar face codificarea corectă a datelor pentru EAS
  
  // Exemplu simplu
  const { articleTitle, articleHash, authorName, tags } = attestationData;
  
  // Codifică datele în format URI
  const encodedTitle = encodeURIComponent(articleTitle || '');
  const encodedHash = encodeURIComponent(articleHash || '');
  const encodedAuthor = encodeURIComponent(authorName || '');
  const encodedTags = encodeURIComponent(tags || '');
  
  // Creează link-ul (în practică, s-ar folosi o codificare ABI corectă)
  return `ethereum:${contractAddress}?method=attest&schemaUID=${schemaUID}&title=${encodedTitle}&hash=${encodedHash}&author=${encodedAuthor}&tags=${encodedTags}`;
};