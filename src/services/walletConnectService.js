import { EthereumProvider } from '@walletconnect/ethereum-provider';

/**
 * Service to handle WalletConnect integration
 */
class WalletConnectService {
  constructor() {
    this.provider = null;
    this.wcUri = null;
  }

  /**
   * Initialize WalletConnect
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Create a standalone provider for WalletConnect v2
      this.provider = await EthereumProvider.init({
        projectId: '0fb8e922943ba0e9f336a032433cdbca', // Replace with your actual ProjectID from WalletConnect Cloud
        chains: [11155111], // Sepolia chain ID
        optionalChains: [1, 137, 56], // Ethereum, Polygon, BSC
        showQrModal: false, // We'll show our own QR code
        methods: ['eth_sendTransaction', 'personal_sign'],
        events: ['chainChanged', 'accountsChanged'],
      });
      
      // Subscribe to connection events
      this.provider.on('connect', (info) => {
        console.log('WalletConnect connected:', info);
      });
      
      this.provider.on('disconnect', (error) => {
        console.log('WalletConnect disconnected:', error);
        this.wcUri = null;
      });
      
      this.provider.on('display_uri', (uri) => {
        // Save the URI for QR code generation
        this.wcUri = uri;
        console.log('WalletConnect QR Code URI:', uri);
      });
      
      return this.provider;
    } catch (error) {
      console.error('Error initializing WalletConnect:', error);
      throw error;
    }
  }

  /**
   * Connect to a wallet using WalletConnect
   * @returns {Promise<{address: string, provider: object}>}
   */
  async connect() {
    if (!this.provider) {
      await this.init();
    }

    try {
      // This will trigger the QR code URI generation via the display_uri event
      const accounts = await this.provider.enable();
      
      if (accounts && accounts.length > 0) {
        return {
          address: accounts[0],
          provider: this.provider,
        };
      } else {
        throw new Error('Nu s-a putut obține adresa portofelului');
      }
    } catch (error) {
      console.error('Error connecting with WalletConnect:', error);
      throw error;
    }
  }

  /**
   * Get the current WalletConnect URI for QR code generation
   * @returns {string|null} - The URI or null if not available
   */
  getWalletConnectUri() {
    return this.wcUri;
  }

  /**
   * Disconnect from WalletConnect
   */
  async disconnect() {
    if (this.provider) {
      await this.provider.disconnect();
      this.wcUri = null;
    }
  }
}

// Export a singleton instance
export const walletConnectService = new WalletConnectService();
