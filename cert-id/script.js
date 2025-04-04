// Add a fallback in case the function is called before DOMContentLoaded
if (!window.handleEthereumLink) {
    window.handleEthereumLink = function(url) {
        console.log("Queuing ethereum link for processing:", url);
        document.addEventListener('DOMContentLoaded', function() {
            if (window.handleEthereumLink && window.handleEthereumLink !== this) {
                window.handleEthereumLink(url);
            }
        });
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Add this function near the top of the DOMContentLoaded handler
    function safeAddEventListener(selector, event, handler, pageSpecific = false) {
        const element = document.getElementById(selector);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        }
        
        if (!pageSpecific) {
            console.warn(`Element with id '${selector}' not found for event '${event}'`);
        }
        return false;
    }

    // Actualizarea orei curente
    function updateTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        if (minutes < 10) minutes = '0' + minutes;
        document.getElementById('current-time').textContent = hours + ':' + minutes;
    }
    
    updateTime();
    setInterval(updateTime, 60000);
    
    // Network configuration for Sepolia testnet
    const NETWORK_CONFIG = {
        name: 'Sepolia',
        chainId: 11155111, // Sepolia chain ID
        rpcUrl: 'https://sepolia.infura.io/v3/6ddd199b633d4d88b51bb77d8be8c86b', // Infura endpoint with API key
        blockExplorer: 'https://sepolia.etherscan.io',
        apiUrl: 'https://api-sepolia.etherscan.io/api'
    };
    
    // Expose network config to global scope
    window.NETWORK_CONFIG = NETWORK_CONFIG;
    
    // Check if ethers library is available
    if (!window.ethers) {
        console.error("ethers.js library could not be loaded");
        showToast("Couldn't load required libraries. Please check your internet connection or try a different browser.", "error");
        
        // Create a simple mock implementation for demo purposes
        window.ethers = {
            Wallet: {
                createRandom: function() {
                    return {
                        address: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                        privateKey: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                        mnemonic: {
                            phrase: 'mock apple banana cherry dog elephant frog garden house igloo jungle kite lion'
                        }
                    };
                },
                fromMnemonic: function(mnemonic) {
                    return {
                        address: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                        privateKey: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
                    };
                }
            }
        };
    }
    
    // Variabile pentru stocarea informațiilor portofelului
    let wallet = null;
    let transactions = [];
    let temporaryWallet = null; // Pentru a stoca portofelul temporar înainte de confirmare
    let provider = null; // To store the Ethereum provider
    
    // Initialize the Ethereum provider for Sepolia testnet
    function initializeProvider() {
        try {
            // Create a JSON RPC provider connected to Sepolia
            provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
            console.log(`Connected to ${NETWORK_CONFIG.name} network`);
            return true;
        } catch (error) {
            console.error('Error initializing provider:', error);
            showToast(`Couldn't connect to ${NETWORK_CONFIG.name} network. Using local mode.`, 'warning');
            return false;
        }
    }
    
    // Implementation for handling ethereum: links
    function handleEthereumLink(url) {
        try {
            // Parse the ethereum: URL
            const parsedUrl = parseEthereumUrl(url);
            
            if (!parsedUrl) {
                throw new Error("Invalid ethereum link format");
            }
            
            console.log("Parsed Ethereum URL:", parsedUrl);
            
            // Check if this is an EAS attestation request
            if (parsedUrl.method === 'attestWithSig') {
                // For attestWithSig, we'll show a special confirmation
                document.getElementById('document-title').textContent = 
                    parsedUrl.params.string instanceof Array ? 
                    parsedUrl.params.string[0] : 
                    (parsedUrl.params.string || "EAS Attestation");
                
                document.getElementById('document-hash').textContent = url;
                
                // Add description to the confirmation modal if it exists
                const descriptionElement = document.getElementById('confirmation-description');
                if (descriptionElement) {
                    descriptionElement.textContent = 
                        `Create attestation for schema: ${parsedUrl.params.uint256?.substring(0, 10)}...`;
                }
                
                // Store the URL for the confirmation handler
                window.currentAttestationUrl = url;
            } else {
                // For regular ethereum transactions
                document.getElementById('document-title').textContent = "Ethereum Transaction";
                document.getElementById('document-hash').textContent = url;
            }
            
            // Display confirmation modal
            if (document.getElementById('qr-modal')) {
                document.getElementById('qr-modal').style.display = 'none';
            }
            document.getElementById('confirmation-modal').style.display = 'flex';
            
        } catch (error) {
            console.error("Error processing ethereum link:", error);
            showToast("Invalid ethereum link format: " + error.message, "error");
        }
    }

    // Function to decode Ethereum URLs
    function parseEthereumUrl(url) {
        const regex = /ethereum:([^\/]+)(?:\/([^?]*))?(?:\?(.*))?/;
        const match = url.match(regex);
        
        if (!match) return null;
        
        const [_, address, method, queryString] = match;
        let params = {};
        
        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            for (const [key, value] of searchParams.entries()) {
                if (params[key]) {
                    if (Array.isArray(params[key])) {
                        params[key].push(value);
                    } else {
                        params[key] = [params[key], value];
                    }
                } else {
                    params[key] = value;
                }
            }
        }
        
        return { address, method, params };
    }

    // Process attestation with signature using EAS SDK
    async function processAttestation(url) {
        try {
            const { address, method, params } = parseEthereumUrl(url);
            
            if (!method || method !== 'attestWithSig') {
                throw new Error(`Unsupported method: ${method || 'none'}`);
            }
            
            // Make sure wallet is initialized
            if (!wallet) {
                throw new Error("Wallet not initialized");
            }
            
            // Initialize EAS client
            const EAS_CONTRACT_ADDRESS = '0xC2679fBD37d54388Ce493F1DB75320D236e1815e'; // Sepolia EAS
            const SCHEMA_UID = params.uint256; // Using the uint256 as schema UID
            
            if (!SCHEMA_UID) {
                throw new Error("Missing schema UID in parameters");
            }
            
            console.log("Processing EAS attestation with:", {
                address,
                method,
                schemaUID: SCHEMA_UID,
                recipient: params.address || "0x0000000000000000000000000000000000000000"
            });
            
            // Create transaction record preemptively with 'pending' status
            const pendingTxId = 'pending-eas-' + Date.now();
            const pendingTransaction = {
                type: 'eas_attestation',
                title: params.string instanceof Array ? params.string[0] : (params.string || 'EAS Attestation'),
                to: EAS_CONTRACT_ADDRESS,
                transactionHash: pendingTxId,
                network: NETWORK_CONFIG.name,
                timestamp: Date.now(),
                status: 'pending'
            };
            
            // Add to transaction history
            addTransaction(pendingTransaction);
            
            // Dynamically import EAS SDK
            if (!EAS) {
                console.log("Importing EAS SDK...");
                try {
                    const EASModule = await import("https://cdn.skypack.dev/@ethereum-attestation-service/eas-sdk@0.28.0");
                    EAS = EASModule.EAS;
                    console.log("EAS SDK imported successfully");
                } catch (importError) {
                    console.error("Error importing EAS SDK:", importError);
                    throw new Error("Could not import EAS SDK. Please check your connection.");
                }
            }
            
            // Create EAS instance
            const eas = new EAS(EAS_CONTRACT_ADDRESS);
            eas.connect(wallet);
            
            // Format attestation data
            const recipient = params.address || "0x0000000000000000000000000000000000000000";
            
            // Encode the data based on parameters
            let encodedData;
            if (params.bytes) {
                encodedData = params.bytes;
            } else {
                // Default encoding if no explicit bytes are provided
                encodedData = ethers.utils.defaultAbiCoder.encode(
                    ['bytes', 'string', 'string'],
                    [
                        params.bytes || '0x',
                        params.string instanceof Array ? params.string[0] : (params.string || ''),
                        params.string instanceof Array ? params.string[1] : ''
                    ]
                );
            }
            
            console.log("Preparing attestation with data:", {
                schema: SCHEMA_UID,
                recipient: recipient,
                data: encodedData.substring(0, 66) + "..."
            });
            
            // Perform the on-chain attestation
            const tx = await eas.attest({
                schema: SCHEMA_UID,
                data: {
                    recipient: recipient, 
                    expirationTime: params.expirationTime ? ethers.BigNumber.from(params.expirationTime) : ethers.BigNumber.from(0),
                    revocable: params.revocable !== "false", // Default to true if not specified
                    refUID: params.refUID || '0x0000000000000000000000000000000000000000000000000000000000000000',
                    data: encodedData,
                    value: params.value ? ethers.utils.parseEther(params.value) : ethers.utils.parseEther("0")
                }
            });
            
            console.log("Attestation transaction sent:", tx.hash);
            
            // Update transaction record with actual hash
            updateTransactionRecord(pendingTxId, tx.hash);
            
            // Wait for confirmation (don't block UI)
            waitForTransactionConfirmation(tx);
            
            return tx.hash;
        } catch (error) {
            console.error("Attestation error:", error);
            throw error;
        }
    }

    // Function to handle EASScan attestation URLs
    function handleEASScanUrl(url) {
        try {
            // Parse the URL
            const easUrl = new URL(url);
            
            // Verify it's an EASScan attestation URL
            if (!easUrl.hostname.includes('easscan.org') || !easUrl.pathname.includes('attestation/create')) {
                throw new Error("Not a valid EASScan attestation URL");
            }
            
            // Extract the query parameters
            const params = Object.fromEntries(easUrl.searchParams);
            
            // Check required parameters
            if (!params.schema) {
                throw new Error("Missing schema parameter in EASScan URL");
            }
            
            // Decode the data parameter (it's URL-encoded JSON)
            let attestationData;
            if (params.data) {
                try {
                    attestationData = JSON.parse(decodeURIComponent(params.data));
                    console.log("Decoded attestation data:", attestationData);
                } catch (jsonError) {
                    console.error("Error decoding JSON data:", jsonError);
                    throw new Error("Invalid JSON data in EASScan URL");
                }
            } else {
                throw new Error("Missing data parameter in EASScan URL");
            }
            
            // Create a configuration object for the attestation
            const easConfig = {
                schemaUID: params.schema,
                recipient: params.recipient || "0x0000000000000000000000000000000000000000",
                attestationData: [],
                chainId: parseInt(params.chainId || NETWORK_CONFIG.chainId),
                revocable: true
            };
            
            // Format the attestation data correctly
            for (const [key, value] of Object.entries(attestationData)) {
                let type = "string";  // Default type
                
                // Determine the correct type
                if (key === "authorAddress") {
                    type = "address";
                } else if (key === "timestamp") {
                    type = "uint256";
                } else if (Array.isArray(value)) {
                    type = "string[]";
                }
                
                easConfig.attestationData.push({
                    name: key,
                    value: value,
                    type: type
                });
            }
            
            console.log("Prepared EAS attestation config:", easConfig);
            
            // Update the confirmation modal with attestation details
            document.getElementById('document-title').textContent = attestationData.articleTitle || "EAS Attestation";
            document.getElementById('document-hash').textContent = url;
            
            // Add description to the confirmation modal if it exists
            const descriptionElement = document.getElementById('confirmation-description');
            if (descriptionElement) {
                descriptionElement.textContent = 
                    `Create attestation for: ${attestationData.articleTitle || "Unknown"}`;
            }
            
            // Store the EAS config for use when confirmed
            window.currentEASConfig = easConfig;
            
            // Display confirmation modal
            if (document.getElementById('qr-modal')) {
                document.getElementById('qr-modal').style.display = 'none';
            }
            document.getElementById('confirmation-modal').style.display = 'flex';
            
        } catch (error) {
            console.error("Error processing EASScan URL:", error);
            showToast("Invalid EASScan URL format: " + error.message, "error");
        }
    }

    // Function to process EAS JSON configuration directly
    function handleEASJsonConfig(jsonData) {
        try {
            // Validate required fields
            if (!jsonData.schema) {
                throw new Error("Missing schema field in EAS JSON config");
            }
            
            if (!jsonData.data || typeof jsonData.data !== 'object') {
                throw new Error("Missing or invalid data field in EAS JSON config");
            }
            
            // Create a configuration object for the attestation
            const easConfig = {
                schemaUID: jsonData.schema,
                recipient: jsonData.recipient || "0x0000000000000000000000000000000000000000",
                attestationData: [],
                chainId: parseInt(jsonData.chainId || NETWORK_CONFIG.chainId),
                revocable: jsonData.revocable !== false
            };
            
            // Format the attestation data correctly
            for (const [key, value] of Object.entries(jsonData.data)) {
                let type = "string";  // Default type
                
                // Determine the correct type
                if (key === "authorAddress") {
                    type = "address";
                } else if (key === "timestamp") {
                    type = "uint256";
                } else if (Array.isArray(value)) {
                    type = "string[]";
                }
                
                easConfig.attestationData.push({
                    name: key,
                    value: value,
                    type: type
                });
            }
            
            console.log("Prepared EAS attestation config from JSON:", easConfig);
            
            // Update the confirmation modal with attestation details
            document.getElementById('document-title').textContent = jsonData.data.articleTitle || "EAS Attestation";
            document.getElementById('document-hash').textContent = JSON.stringify(jsonData, null, 2);
            
            // Add description to the confirmation modal if it exists
            const descriptionElement = document.getElementById('confirmation-description');
            if (descriptionElement) {
                descriptionElement.textContent = 
                    `Create attestation for: ${jsonData.data.articleTitle || "Unknown"}`;
            }
            
            // Store the EAS config for use when confirmed
            window.currentEASConfig = easConfig;
            
            // Display confirmation modal
            if (document.getElementById('qr-modal')) {
                document.getElementById('qr-modal').style.display = 'none';
            }
            document.getElementById('confirmation-modal').style.display = 'flex';
            
        } catch (error) {
            console.error("Error processing EAS JSON config:", error);
            showToast("Invalid EAS JSON format: " + error.message, "error");
        }
    }

    // Create EAS attestation from config
    async function createEASAttestationFromConfig(config) {
        try {
            console.log("Creating EAS attestation from config:", config);
            
            // Verify wallet is initialized
            if (!wallet || !provider) {
                throw new Error("Wallet or provider not initialized");
            }
            
            // Show loading spinner if it exists
            const spinner = document.getElementById('attestation-spinner');
            if (spinner) spinner.style.display = 'block';
            
            // Create transaction record preemptively with 'pending' status
            const pendingTxId = 'pending-eas-' + Date.now();
            const pendingTransaction = {
                type: 'eas_attestation',
                title: config.attestationData.find(item => item.name === "articleTitle")?.value || 'EAS Attestation',
                to: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",  // EAS contract address
                transactionHash: pendingTxId,
                network: NETWORK_CONFIG.name,
                timestamp: Date.now(),
                status: 'pending'
            };
            
            // Add to transaction history
            addTransaction(pendingTransaction);
            
            try {
                // Load the EAS SDK dynamically
                const EASModule = await import("https://cdn.skypack.dev/@ethereum-attestation-service/eas-sdk@0.28.0");
                const { EAS, SchemaEncoder } = EASModule;
                
                // Create EAS instance
                const eas = new EAS("0xC2679fBD37d54388Ce493F1DB75320D236e1815e");
                eas.connect(wallet);
                
                // Create schema encoder based on our known schema
                const schemaEncoder = new SchemaEncoder(
                    "address authorAddress,string authorName,string articleTitle,string articleHash,uint256 timestamp,string[] tags"
                );
                
                // Encode the data using the schema encoder
                const encodedData = schemaEncoder.encodeData(config.attestationData);
                
                // Create the attestation with proper parameters
                const tx = await eas.attest({
                    schema: config.schemaUID,
                    data: {
                        recipient: config.recipient,
                        expirationTime: 0,  // No expiration
                        revocable: config.revocable,
                        data: encodedData
                    }
                });
                
                console.log("EAS attestation transaction sent:", tx.hash);
                
                // Update transaction record with actual hash
                updateTransactionRecord(pendingTxId, tx.hash);
                
                // Hide the spinner
                if (spinner) spinner.style.display = 'none';
                
                // Show success message
                showToast(`EAS attestation sent: ${tx.hash.substring(0, 10)}...`, 'success');
                
                // Wait for confirmation (don't block UI)
                waitForTransactionConfirmation(tx);
                
                return tx.hash;
            } catch (loadError) {
                console.error("Error loading or using EAS SDK:", loadError);
                
                // Fall back to manual transaction approach
                console.log("Falling back to manual EAS attestation...");
                
                // Prepare a manual Ethereum transaction to the EAS contract
                const easContractAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
                
                // Create raw calldata for the attestation
                // Note: This is a simplified approach. For production, use proper ABI encoding
                const attestFunctionSignature = "0xe5753c0a"; // keccak256("attest(...")
                
                // Here we would need to properly encode the attestation parameters
                // This is a placeholder - in a real implementation you would need proper ABI encoding
                const data = attestFunctionSignature + "..."; // Simplified
                
                // Create transaction request
                const transactionRequest = {
                    to: easContractAddress,
                    data: data,
                    value: ethers.utils.parseEther("0"),
                    chainId: NETWORK_CONFIG.chainId
                };
                
                // Use our existing function to send the transaction
                const txHash = await signAndSendJsonTransaction(transactionRequest, pendingTransaction.title);
                
                // Update transaction record
                updateTransactionRecord(pendingTxId, txHash);
                
                return txHash;
            }
        } catch (error) {
            console.error("Error creating EAS attestation:", error);
            
            // Hide the spinner
            const spinner = document.getElementById('attestation-spinner');
            if (spinner) spinner.style.display = 'none';
            
            showToast("EAS attestation failed: " + error.message, "error");
            throw error;
        }
    }
    
    // Immediately expose this function to the global scope
    window.handleEthereumLink = handleEthereumLink;
    window.handleEASScanUrl = handleEASScanUrl;
    window.handleEASJsonConfig = handleEASJsonConfig;
    window.createEASAttestationFromConfig = createEASAttestationFromConfig;
    window.parseEthereumUrl = parseEthereumUrl;
    window.processAttestation = processAttestation;
    
    // Funcție pentru afișarea mesajelor toast
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast-message');
        toast.textContent = message;
        toast.className = 'toast ' + type;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
    
    // Afișează întotdeauna ecranul de creare portofel la început
    function showInitialScreen() {
        const walletCreationModal = document.getElementById('wallet-creation-modal');
        if (walletCreationModal) {
            walletCreationModal.style.display = 'flex';
        } else {
            console.warn('Wallet creation modal not found. Redirecting to index.html...');
            window.location.href = 'index.html';
        }
    }
    
    // Verifică dacă există un portofel și decide dacă afișează ecranul de creare
    async function checkWallet() {
        // Initialize the provider first
        initializeProvider();
        
        const savedMnemonic = localStorage.getItem('certid-wallet-mnemonic');
        const savedWallet = localStorage.getItem('certid-wallet');
        
        if (savedMnemonic || savedWallet) {
            // Există portofel, inițializează-l
            await initializeWallet();
        } else {
            // Nu există portofel, afișează întotdeauna ecranul de creare
            showInitialScreen();
        }
    }
    
    // Inițializare portofel
    async function initializeWallet() {
        try {
            // Verifică dacă există un portofel salvat în localStorage
            const savedMnemonic = localStorage.getItem('certid-wallet-mnemonic');
            const savedWallet = localStorage.getItem('certid-wallet');
            
            console.log("Trying to initialize wallet:");
            console.log("- Have mnemonic:", !!savedMnemonic);
            console.log("- Have private key:", !!savedWallet);
            
            if (savedMnemonic) {
                // Restaurează portofelul din cuvintele mnemonice și conectează-l la provider
                wallet = ethers.Wallet.fromMnemonic(savedMnemonic);
                if (provider) {
                    wallet = wallet.connect(provider);
                }
                console.log("Wallet restored from mnemonic successfully on", NETWORK_CONFIG.name);
                // Asigură-te că cheia privată este salvată pentru compatibilitate
                localStorage.setItem('certid-wallet', wallet.privateKey);
            } else if (savedWallet) {
                // Restaurează portofelul din cheia privată și generează mnemonice
                wallet = new ethers.Wallet(savedWallet);
                if (provider) {
                    wallet = wallet.connect(provider);
                }
                console.log("Wallet restored from private key successfully on", NETWORK_CONFIG.name);
                // Note: We don't generate new mnemonics from an existing private key
                // as that's not cryptographically possible
            }
            
            // Update wallet address display if it exists
            const walletAddressElement = document.getElementById('wallet-address');
            if (walletAddressElement) {
                walletAddressElement.textContent = wallet.address;
                
                // Update the display to show we're on Sepolia testnet
                const networkLabel = document.querySelector('.wallet-card .label');
                if (networkLabel) {
                    networkLabel.textContent = `Identitate Blockchain (${NETWORK_CONFIG.name})`;
                }
                
                // Funcționalitate de copiere pentru adresă
                walletAddressElement.addEventListener('click', function() {
                    navigator.clipboard.writeText(wallet.address).then(() => {
                        showToast('Adresa copiată în clipboard');
                    });
                });
            }
            
            // Încarcă tranzacțiile salvate
            loadTransactions();
        } catch (error) {
            console.error('Eroare detaliată la inițializarea portofelului:', error);
            showToast('Eroare la inițializarea portofelului. Încearcați să reîncărcați pagina.', 'error');
            // Dacă avem eroare, arătăm ecranul de creare
            showInitialScreen();
        }
    }
    
    // Creează un portofel nou și arată cuvintele mnemonice pentru backup
    function createNewWallet() {
        try {
            console.log("Creating new wallet...");
            // Creează un portofel nou cu cuvinte mnemonice
            const randomWallet = ethers.Wallet.createRandom();
            console.log("Wallet created:", randomWallet.address);
            temporaryWallet = randomWallet;
            
            // Afișează cuvintele mnemonice în modal pentru backup
            document.getElementById('new-wallet-mnemonic').textContent = randomWallet.mnemonic.phrase;
            
            // Ascunde modalul de creare și afișează modalul de confirmare backup
            document.getElementById('wallet-creation-modal').style.display = 'none';
            document.getElementById('backup-acknowledge-modal').style.display = 'flex';
            
        } catch (error) {
            console.error('Eroare la crearea portofelului:', error);
            showToast('Eroare la crearea portofelului. Verificați consola pentru detalii.', 'error');
        }
    }
    
    // Finalizează crearea portofelului după confirmarea backup-ului
    function finalizeWalletCreation() {
        if (!temporaryWallet) {
            showToast('Eroare la crearea portofelului', 'error');
            return;
        }
        
        // Salvează portofelul
        wallet = temporaryWallet;
        localStorage.setItem('certid-wallet', wallet.privateKey);
        localStorage.setItem('certid-wallet-mnemonic', wallet.mnemonic.phrase);
        
        // Ascunde modalul de confirmare
        document.getElementById('backup-acknowledge-modal').style.display = 'none';
        
        // Inițializează portofelul
        initializeWallet();
        
        showToast('Portofel nou creat cu succes!');
    }
    
    // Încarcă tranzacțiile din localStorage
    function loadTransactions() {
        const savedTransactions = localStorage.getItem('certid-transactions');
        if (savedTransactions) {
            transactions = JSON.parse(savedTransactions);
            renderTransactions();
        }
    }
    
    // Salvează tranzacțiile în localStorage
    function saveTransactions() {
        localStorage.setItem('certid-transactions', JSON.stringify(transactions));
    }
    
    // Adaugă o nouă tranzacție
    function addTransaction(transaction) {
        // Add the network information to the transaction
        transaction.network = NETWORK_CONFIG.name;
        
        transactions.unshift(transaction); // Adaugă la începutul listei
        saveTransactions();
        renderTransactions();
    }
    
    // Randează lista de tranzacții
    function renderTransactions() {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;
        
        // Curăță lista
        transactionList.innerHTML = '';
        
        if (transactions.length === 0) {
            transactionList.innerHTML = '<div class="transaction-item" style="text-align: center; color: var(--text-tertiary);">Nu există tranzacții încă</div>';
            return;
        }
        
        // Afișează primele 3 tranzacții
        const displayTransactions = transactions.slice(0, 3);
        
        displayTransactions.forEach(tx => {
            const txElement = document.createElement('div');
            txElement.className = 'transaction-item';
            
            const icon = '📄';
            const title = tx.title || 'Tranzacție Necunoscută';
            
            const date = new Date(tx.timestamp);
            const formattedDate = date.toLocaleDateString('ro-RO');
            
            txElement.innerHTML = `
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-title">${title}</div>
                    <div class="transaction-date">${formattedDate}</div>
                </div>
                <div class="chevron">›</div>
            `;
            
            txElement.addEventListener('click', function() {
                showTransactionDetails(tx);
            });
            
            transactionList.appendChild(txElement);
        });
    }
    
    // Afișează detaliile unei tranzacții
    function showTransactionDetails(transaction) {
        let details = `Tip: ${transaction.type === 'ethereum_transaction' ? 'Tranzacție Ethereum' : 'Tranzacție'}\n`;
        details += `Rețea: ${transaction.network || 'Necunoscută'}\n`;
        details += `Status: ${getStatusText(transaction.status)}\n`;
        details += `Data: ${new Date(transaction.timestamp).toLocaleString('ro-RO')}\n`;
        details += `Titlu: ${transaction.title}\n`;
        
        if (transaction.to) {
            details += `Destinatar: ${transaction.to}\n`;
        }
        
        if (transaction.data) {
            details += `Data: ${transaction.data}\n`;
        }
        
        details += `Hash Tranzacție: ${transaction.transactionHash}\n`;
        
        if (transaction.blockNumber) {
            details += `Bloc: ${transaction.blockNumber}\n`;
        }
        
        // Add link to block explorer if available
        if (transaction.transactionHash && transaction.transactionHash.startsWith('0x')) {
            const explorerUrl = `${NETWORK_CONFIG.blockExplorer}/tx/${transaction.transactionHash}`;
            details += `\nVezi pe Etherscan: ${explorerUrl}`;
        }
        
        alert(details);
    }
    
    // Helper to get user-friendly status text
    function getStatusText(status) {
        switch(status) {
            case 'pending': return 'În așteptare';
            case 'confirmed': return 'Confirmată';
            case 'error': return 'Eroare';
            default: return 'Necunoscut';
        }
    }
    
    // Primary function for signing and sending Ethereum transactions
    async function signAndSendEthereumTransaction(ethereumLink, title = "Ethereum Transaction") {
        return new Promise((resolve, reject) => {
            // Show loading spinner if it exists
            const spinner = document.getElementById('attestation-spinner');
            if (spinner) spinner.style.display = 'block';
            
            try {
                console.log("Processing ethereum transaction:", ethereumLink);
                
                if (!wallet || !provider) {
                    throw new Error("Wallet or provider not initialized");
                }
                
                // Parse the ethereum: URL
                const ethUrl = new URL(ethereumLink);
                const toAddress = ethUrl.pathname;
                const params = Object.fromEntries(ethUrl.searchParams);
                
                console.log("Transaction target address:", toAddress);
                console.log("Transaction parameters:", params);
                
                // Create transaction request object
                const transactionRequest = {
                    to: toAddress,
                    data: params.data || '0x',
                    value: params.value ? ethers.utils.parseEther(params.value) : ethers.utils.parseEther("0"),
                    chainId: parseInt(params.chainId || NETWORK_CONFIG.chainId),
                };
                
                // Add gas parameters if specified
                if (params.gasLimit) transactionRequest.gasLimit = ethers.BigNumber.from(params.gasLimit);
                if (params.gasPrice) transactionRequest.gasPrice = ethers.BigNumber.from(params.gasPrice);
                
                console.log("Prepared transaction request:", transactionRequest);
                
                // Execute the transaction with proper steps
                (async () => {
                    try {
                        // Create transaction record preemptively with 'pending' status
                        const pendingTxId = 'pending-' + Date.now();
                        const pendingTransaction = {
                            type: 'ethereum_transaction',
                            title: title || 'Ethereum Transaction',
                            to: toAddress,
                            data: params.data ? params.data.substring(0, 66) + "..." : "None",
                            transactionHash: pendingTxId,
                            network: NETWORK_CONFIG.name,
                            timestamp: Date.now(),
                            status: 'pending'
                        };
                        
                        // Add to transaction history
                        addTransaction(pendingTransaction);
                        
                        // Try automatic gas estimation first
                        try {
                            // 1. Populate the transaction
                            console.log("Populating transaction...");
                            const populatedTransaction = await wallet.populateTransaction(transactionRequest);
                            
                            // 2. Estimate gas (this might fail for contracts that revert)
                            console.log("Estimating gas...");
                            populatedTransaction.gasLimit = await provider.estimateGas(populatedTransaction);
                            console.log("Estimated gas limit:", populatedTransaction.gasLimit.toString());
                            
                            // 3. Send transaction with estimated gas
                            console.log("Sending transaction...");
                            const transactionResponse = await wallet.sendTransaction(populatedTransaction);
                            console.log("Transaction sent:", transactionResponse.hash);
                            
                            // Update transaction record with actual hash
                            updateTransactionRecord(pendingTxId, transactionResponse.hash);
                            
                            // Hide the spinner
                            if (spinner) spinner.style.display = 'none';
                            
                            // Show initial success message
                            showToast(`Tranzacție trimisă: ${transactionResponse.hash.substring(0, 10)}...`, 'success');
                            
                            // 4. Wait for confirmation (optional, do not block UI)
                            waitForTransactionConfirmation(transactionResponse);
                            
                            // Return the transaction hash immediately
                            resolve(transactionResponse.hash);
                            
                        } catch (gasError) {
                            // Handle gas estimation failures - common with contract reverts
                            console.warn("Gas estimation failed:", gasError);
                            
                            if (gasError.code === "UNPREDICTABLE_GAS_LIMIT") {
                                console.log("Using manual gas limit instead");
                                
                                // Set a manual gas limit
                                transactionRequest.gasLimit = ethers.BigNumber.from("500000");
                                
                                try {
                                    // Try again with manual gas limit
                                    console.log("Sending transaction with manual gas limit...");
                                    const transactionResponse = await wallet.sendTransaction(transactionRequest);
                                    console.log("Transaction sent with manual gas:", transactionResponse.hash);
                                    
                                    // Update transaction record with actual hash
                                    updateTransactionRecord(pendingTxId, transactionResponse.hash);
                                    
                                    // Hide the spinner
                                    if (spinner) spinner.style.display = 'none';
                                    
                                    // Show success message
                                    showToast(`Tranzacție trimisă: ${transactionResponse.hash.substring(0, 10)}...`, 'success');
                                    
                                    // Wait for confirmation
                                    waitForTransactionConfirmation(transactionResponse);
                                    
                                    // Return the transaction hash
                                    resolve(transactionResponse.hash);
                                } catch (manualError) {
                                    // Final transaction failure
                                    handleTransactionError(manualError, pendingTxId, spinner, reject);
                                }
                            } else {
                                // Other gas estimation errors
                                handleTransactionError(gasError, pendingTxId, spinner, reject);
                            }
                        }
                        
                    } catch (txError) {
                        // General transaction preparation errors
                        console.error("Transaction error:", txError);
                        if (spinner) spinner.style.display = 'none';
                        
                        // Create appropriate error message
                        let errorMessage = "Tranzacție eșuată";
                        if (txError.reason) {
                            errorMessage += ": " + txError.reason;
                        } else if (txError.message) {
                            if (txError.message.includes("user rejected")) {
                                errorMessage = "Tranzacție respinsă de utilizator";
                            } else if (txError.message.includes("insufficient funds")) {
                                errorMessage = "Fonduri insuficiente pentru tranzacție";
                            } else if (txError.message.includes("429")) {
                                errorMessage = "Prea multe cereri. Încearcă din nou peste câteva minute.";
                            }
                        }
                        
                        showToast(errorMessage, 'error');
                        reject(txError);
                    }
                })();
                    
            } catch (error) {
                console.error("Error processing ethereum link:", error);
                if (spinner) spinner.style.display = 'none';
                showToast("Eroare la procesarea link-ului ethereum", 'error');
                reject(error);
            }
        });
    }
    
    // Helper function to handle transaction errors
    function handleTransactionError(error, pendingTxId, spinner, rejectFn) {
        console.error("Transaction error:", error);
        if (spinner) spinner.style.display = 'none';
        
        // Update the pending transaction to error state
        updateTransactionStatus(pendingTxId, 'error');
        
        // Create appropriate error message
        let errorMessage = "Tranzacție eșuată";
        if (error.reason) {
            errorMessage += ": " + error.reason;
        } else if (error.message) {
            if (error.message.includes("user rejected")) {
                errorMessage = "Tranzacție respinsă de utilizator";
            } else if (error.message.includes("insufficient funds")) {
                errorMessage = "Fonduri insuficiente pentru tranzacție";
            } else if (error.message.includes("429")) {
                errorMessage = "Prea multe cereri. Încearcă din nou peste câteva minute.";
            } else if (error.message.includes("execution reverted")) {
                errorMessage = "Tranzacție respinsă de contract: execution reverted";
                if (error.data) {
                    // Try to decode error data if available
                    try {
                        const errorInterface = new ethers.utils.Interface(["function Error(string)"]);
                        const decodedError = errorInterface.parseError(error.data);
                        errorMessage += " - " + decodedError.args[0];
                    } catch (e) {
                        // If decoding fails, just use the original message
                        console.log("Could not decode error data");
                    }
                }
            }
        }
        
        showToast(errorMessage, 'error');
        rejectFn(error);
    }
    
    // Helper function to update a transaction's hash
    function updateTransactionRecord(oldTxId, newTxHash) {
        const savedTransactions = localStorage.getItem('certid-transactions');
        if (savedTransactions) {
            const transactions = JSON.parse(savedTransactions);
            const txIndex = transactions.findIndex(tx => tx.transactionHash === oldTxId);
            
            if (txIndex !== -1) {
                transactions[txIndex].transactionHash = newTxHash;
                localStorage.setItem('certid-transactions', JSON.stringify(transactions));
                
                // Re-render transactions if we're on the wallet page
                if (document.getElementById('transaction-list')) {
                    renderTransactions();
                }
            }
        }
    }
    
    // Helper function to wait for transaction confirmation and update status
    function waitForTransactionConfirmation(txResponse) {
        txResponse.wait(1).then(receipt => {
            console.log("Transaction confirmed in block:", receipt.blockNumber);
            
            // Update transaction status
            updateTransactionStatus(txResponse.hash, 'confirmed', receipt.blockNumber);
            
            // Show confirmation message
            showToast(`Tranzacție confirmată în blocul ${receipt.blockNumber}`, 'success');
        }).catch(waitError => {
            console.error("Error waiting for confirmation:", waitError);
            updateTransactionStatus(txResponse.hash, 'error');
        });
    }
    
    // Helper function to update transaction status
    function updateTransactionStatus(txHash, status, blockNumber = null) {
        const savedTransactions = localStorage.getItem('certid-transactions');
        if (savedTransactions) {
            const transactions = JSON.parse(savedTransactions);
            const txIndex = transactions.findIndex(tx => tx.transactionHash === txHash);
            
            if (txIndex !== -1) {
                transactions[txIndex].status = status;
                if (blockNumber) {
                    transactions[txIndex].blockNumber = blockNumber;
                }
                localStorage.setItem('certid-transactions', JSON.stringify(transactions));
                
                // Re-render transactions if we're on the wallet page
                if (document.getElementById('transaction-list')) {
                    renderTransactions();
                }
            }
        }
    }
    
    // EAS Debug function - can be called from browser console
    async function debugEAS(customSchemaUID) {
        try {
            // Use the EAS contract address on Sepolia
            const easAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
            
            // Default schema UID or use custom one if provided
            const schemaUID = customSchemaUID || "0x940a0f0b3280c5b67e09aaab239f62e2eb9af35ae50dab4eb45fa552e8e8bf60";
            
            // Check if provider is initialized
            if (!provider) {
                console.error("Provider not initialized. Attempting to initialize...");
                initializeProvider();
                if (!provider) {
                    throw new Error("Failed to initialize provider");
                }
            }
            
            // Get schema info using a minimal ABI for the function we need
            const abi = ["function getSchema(bytes32 uid) view returns (tuple(bytes32 uid, address resolver, bool revocable, string schema))"];
            const contract = new ethers.Contract(easAddress, abi, provider);
            
            console.log("Querying EAS contract at:", easAddress);
            console.log("For schema:", schemaUID);
            
            // Make the call
            const schemaInfo = await contract.getSchema(schemaUID);
            console.log("Schema info:", schemaInfo);
            
            // Extract the schema string for easier viewing
            console.log("Schema definition:", schemaInfo.schema);
            
            return schemaInfo;
        } catch (error) {
            console.error("Error debugging EAS:", error);
            console.error("Error details:", error.message);
            
            if (error.message.includes("missing revert data")) {
                console.warn("This might indicate the contract doesn't exist at this address or doesn't have the expected function");
            } else if (error.message.includes("invalid address")) {
                console.warn("Check that the EAS contract address is correct");
            }
            
            return null;
        }
    }
    
    // Add the debug function to the global scope
    window.debugEAS = debugEAS;
    
    // Function to process JSON transaction data
    async function processJsonTransactionData(jsonData) {
        return new Promise((resolve, reject) => {
            try {
                // Extract transaction data
                const transactionData = jsonData.transaction || jsonData;
                
                // Validate required fields
                if (!transactionData.to) {
                    throw new Error("Missing 'to' address in transaction data");
                }
                
                // Create transaction request object
                const transactionRequest = {
                    to: transactionData.to,
                    data: transactionData.data || '0x',
                    value: transactionData.value ? 
                        ethers.utils.parseEther(transactionData.value.toString()) : 
                        ethers.utils.parseEther("0"),
                    chainId: parseInt(transactionData.chainId || NETWORK_CONFIG.chainId),
                };
                
                // Add gas parameters if specified
                if (transactionData.gasLimit) {
                    transactionRequest.gasLimit = ethers.BigNumber.from(transactionData.gasLimit);
                }
                if (transactionData.gasPrice) {
                    transactionRequest.gasPrice = ethers.BigNumber.from(transactionData.gasPrice);
                }
                
                console.log("Prepared transaction request from JSON:", transactionRequest);
                
                // Execute the transaction using our existing function
                signAndSendJsonTransaction(transactionRequest, jsonData.title || "JSON Transaction")
                    .then(resolve)
                    .catch(reject);
                    
            } catch (error) {
                console.error("Error processing JSON transaction data:", error);
                reject(error);
            }
        });
    }
    
    // Function to sign and send transaction from JSON data
    async function signAndSendJsonTransaction(transactionRequest, title = "JSON Transaction") {
        // This is similar to signAndSendEthereumTransaction but takes a transaction request object directly
        return new Promise((resolve, reject) => {
            // Show loading spinner if it exists
            const spinner = document.getElementById('attestation-spinner');
            if (spinner) spinner.style.display = 'block';
            
            try {
                console.log("Processing JSON transaction:", transactionRequest);
                
                if (!wallet || !provider) {
                    throw new Error("Wallet or provider not initialized");
                }
                
                // Execute the transaction with proper steps
                (async () => {
                    try {
                        // Create transaction record preemptively with 'pending' status
                        const pendingTxId = 'pending-' + Date.now();
                        const pendingTransaction = {
                            type: 'ethereum_transaction',
                            title: title,
                            to: transactionRequest.to,
                            data: transactionRequest.data ? 
                                  transactionRequest.data.substring(0, 66) + "..." : "None",
                            transactionHash: pendingTxId,
                            network: NETWORK_CONFIG.name,
                            timestamp: Date.now(),
                            status: 'pending'
                        };
                        
                        // Add to transaction history
                        addTransaction(pendingTransaction);
                        
                        // Rest of transaction handling is the same as in signAndSendEthereumTransaction
                        // ...existing transaction handling code...
                        
                        // Try automatic gas estimation first
                        try {
                            // 1. Populate the transaction
                            console.log("Populating transaction...");
                            const populatedTransaction = await wallet.populateTransaction(transactionRequest);
                            
                            // 2. Estimate gas (this might fail for contracts that revert)
                            console.log("Estimating gas...");
                            populatedTransaction.gasLimit = await provider.estimateGas(populatedTransaction);
                            console.log("Estimated gas limit:", populatedTransaction.gasLimit.toString());
                            
                            // 3. Send transaction with estimated gas
                            console.log("Sending transaction...");
                            const transactionResponse = await wallet.sendTransaction(populatedTransaction);
                            console.log("Transaction sent:", transactionResponse.hash);
                            
                            // Update transaction record with actual hash
                            updateTransactionRecord(pendingTxId, transactionResponse.hash);
                            
                            // Hide the spinner
                            if (spinner) spinner.style.display = 'none';
                            
                            // Show initial success message
                            showToast(`Tranzacție trimisă: ${transactionResponse.hash.substring(0, 10)}...`, 'success');
                            
                            // 4. Wait for confirmation (optional, do not block UI)
                            waitForTransactionConfirmation(transactionResponse);
                            
                            // Return the transaction hash immediately
                            resolve(transactionResponse.hash);
                            
                        } catch (error) {
                            handleTransactionError(error, pendingTxId, spinner, reject);
                        }
                    } catch (txError) {
                        // General transaction preparation errors
                        console.error("Transaction error:", txError);
                        if (spinner) spinner.style.display = 'none';
                        reject(txError);
                    }
                })();
            } catch (error) {
                console.error("Error processing JSON transaction:", error);
                if (spinner) spinner.style.display = 'none';
                showToast("Error processing JSON transaction", 'error');
                reject(error);
            }
        });
    }
    
    // Make function available globally
    window.processJsonTransactionData = processJsonTransactionData;
    
    // Add after processJsonTransactionData function

    // Function to decode EAS transaction data for debugging
    function decodeEASTransactionData(data) {
        try {
            console.log("Decoding EAS transaction data:", data);
            
            // Extract function selector (first 4 bytes)
            const functionSelector = data.substring(0, 10);
            console.log("Function selector:", functionSelector);
            
            // Common EAS function selectors
            const knownSelectors = {
                "0xf2d27995": "attest(SchemaUID,AttestationRequestData)",
                "0xf17325e7": "attestByDelegation(SchemaUID,AttestationRequestData,DelegationRequest)",
                "0x3c5a6679": "multiAttest(SchemaUID,MultiAttestationRequest[])"
            };
            
            console.log("Function name:", knownSelectors[functionSelector] || "Unknown function");
            
            // Log the raw data in chunks for easier inspection
            console.log("Raw data breakdown:");
            for (let i = 10; i < data.length; i += 64) {
                const chunk = data.substring(i, i + 64);
                console.log(`[${i}-${i+64}]: ${chunk}`);
            }
            
            return {
                selector: functionSelector,
                functionName: knownSelectors[functionSelector] || "Unknown function",
                rawData: data
            };
        } catch (error) {
            console.error("Error decoding transaction data:", error);
            return null;
        }
    }
    
    // Global access for console debugging
    window.decodeEASTransactionData = decodeEASTransactionData;
    
    // Event listeners setup - selectively attach based on which elements exist in the current page
    
    // Event listeners for wallet creation - index.html only
    safeAddEventListener('create-new-wallet', 'click', createNewWallet, true);
    
    safeAddEventListener('backup-confirmation', 'change', function() {
        const confirmBackupBtn = document.getElementById('confirm-backup');
        if (confirmBackupBtn) {
            confirmBackupBtn.disabled = !this.checked;
        }
    }, true);
    
    safeAddEventListener('confirm-backup', 'click', finalizeWalletCreation, true);
    
    safeAddEventListener('show-restore-option', 'click', function() {
        document.getElementById('wallet-creation-modal').style.display = 'none';
        document.getElementById('restore-modal').style.display = 'flex';
    }, true);
    
    // Settings and wallet action buttons - settings.html only
    safeAddEventListener('backup-wallet-button', 'click', showBackupModal, true);
    safeAddEventListener('restore-wallet-button', 'click', showRestoreModal, true);
    
    safeAddEventListener('new-wallet-button', 'click', function() {
        if (confirm('Ești sigur că dorești să generezi o cheie privată nouă? Acest lucru va înlocui portofelul curent.')) {
            // Reseteză portofelul actual
            localStorage.removeItem('certid-wallet');
            localStorage.removeItem('certid-wallet-mnemonic');
            // Arată ecranul de creare portofel
            showInitialScreen();
        }
    }, true);
    
    // Confirmation modal event listeners - these should work across pages
    safeAddEventListener('close-confirmation-modal', 'click', function() {
        document.getElementById('confirmation-modal').style.display = 'none';
    });
    
    safeAddEventListener('cancel-attestation', 'click', function() {
        document.getElementById('confirmation-modal').style.display = 'none';
    });
    
    safeAddEventListener('confirm-attestation', 'click', async function() {
        const documentHash = document.getElementById('document-hash').textContent;
        const documentTitle = document.getElementById('document-title').textContent;
        
        try {
            // Show processing indicator
            document.getElementById('attestation-spinner').style.display = 'block';
            
            console.log("Processing transaction or attestation...");
            
            let txHash;
            
            // Check if this is a WalletConnect request
            if (window.currentWalletConnectRequest) {
                console.log("Handling as WalletConnect request");
                
                const request = window.currentWalletConnectRequest;
                const requestId = request.id;
                const pendingRequest = walletConnectPendingRequests[requestId];
                
                if (pendingRequest && pendingRequest.resolve) {
                    // For eth_sendTransaction, we need to actually send the transaction
                    if (request.method === 'eth_sendTransaction') {
                        const txParams = request.params[0];
                        
                        // Create ethereum: URL from parameters
                        let ethereumUrl = `ethereum:${txParams.to}?`;
                        const params = [];
                        if (txParams.data) params.push(`data=${txParams.data}`);
                        if (txParams.value) params.push(`value=${txParams.value}`);
                        if (txParams.gasPrice) params.push(`gasPrice=${txParams.gasPrice}`);
                        if (txParams.gas) params.push(`gasLimit=${txParams.gas}`);
                        ethereumUrl += params.join('&');
                        
                        // Send transaction using our existing function
                        txHash = await signAndSendEthereumTransaction(
                            ethereumUrl, 
                            `WalletConnect: ${window.walletConnectSession.peerMeta?.name || "Unknown dApp"}`
                        );
                        
                        // Resolve the pending promise with the transaction hash
                        pendingRequest.resolve(txHash);
                    }
                }
                
                // Clear current request
                window.currentWalletConnectRequest = null;
                
            } else if (window.currentEASConfig) {
                console.log("Handling as EAS attestation");
                txHash = await createEASAttestationFromConfig(window.currentEASConfig);
                window.currentEASConfig = null;
            } else if (documentHash.includes("easscan.org/attestation/create")) {
                console.log("Processing EASScan URL");
                await handleEASScanUrl(documentHash);
                document.getElementById('attestation-spinner').style.display = 'none';
                return;
            } else if (documentHash.includes('ethereum:')) {
                console.log("Handling as ethereum transaction");
                
                // Check if it's an attestWithSig URL that wasn't properly parsed earlier
                const parsedUrl = parseEthereumUrl(documentHash);
                
                if (parsedUrl && parsedUrl.method === 'attestWithSig') {
                    txHash = await processAttestation(documentHash);
                } else {
                    txHash = await signAndSendEthereumTransaction(documentHash, documentTitle);
                }
            } else {
                console.log("Handling as regular attestation");
                txHash = await window.attestDocument(documentHash, documentTitle);
            }
            
            // Hide confirmation modal
            document.getElementById('confirmation-modal').style.display = 'none';
            
            // Show success message
            showToast(`Transaction submitted: ${txHash?.substring(0, 10) || 'Success'}...`, 'success');
            
        } catch (error) {
            // Hide spinner
            document.getElementById('attestation-spinner').style.display = 'none';
            
            console.error('Error processing transaction:', error);
            showToast('Transaction failed: ' + (error.message || "Unknown error"), 'error');
        }
    });
    
    // View all transactions button
    safeAddEventListener('view-all', 'click', function() {
        if (transactions.length === 0) {
            showToast('Nu există tranzacții de afișat');
            return;
        }
        
        // În aplicația reală, aici ar trebui să navigați la o pagină de tranzacții
        let txDetails = 'Toate Tranzacțiile:\n\n';
        
        transactions.forEach((tx, index) => {
            txDetails += `${index + 1}. ${tx.title}\n`;
            txDetails += `   Data: ${new Date(tx.timestamp).toLocaleString('ro-RO')}\n`;
            if (tx.transactionHash) {
                txDetails += `   Hash: ${tx.transactionHash.substring(0, 10)}...\n`;
            }
            txDetails += '\n';
        });
        
        alert(txDetails);
    });
    
    // Backup wallet modal functions
    function showBackupModal() {
        // Obține cuvintele mnemonice
        const mnemonic = localStorage.getItem('certid-wallet-mnemonic');
        
        if (mnemonic) {
            // Afișează cuvintele în modal
            document.getElementById('mnemonic-phrase').textContent = mnemonic;
            document.getElementById('backup-modal').style.display = 'flex';
        } else {
            showToast('Nu s-au putut găsi cuvintele de recuperare', 'error');
        }
    }
    
    // Funcție pentru copierea cuvintelor mnemonice
    safeAddEventListener('copy-mnemonic', 'click', function() {
        const mnemonic = document.getElementById('mnemonic-phrase').textContent;
        navigator.clipboard.writeText(mnemonic).then(() => {
            showToast('Cuvinte copiate în clipboard');
        });
    }, true);
    
    // Închide modalul de backup
    safeAddEventListener('close-backup-modal', 'click', function() {
        document.getElementById('backup-modal').style.display = 'none';
    }, true);
    
    // Funcție pentru afișarea modalului de restaurare
    function showRestoreModal() {
        document.getElementById('restore-modal').style.display = 'flex';
    }
    
    // Închide modalul de restaurare
    safeAddEventListener('close-restore-modal', 'click', function() {
        document.getElementById('restore-modal').style.display = 'none';
    }, true);
    
    // Restaurează portofelul din cuvinte mnemonice
    safeAddEventListener('restore-wallet', 'click', async function() {
        const mnemonicPhrase = document.getElementById('restore-phrase').value.trim();
        
        if (!mnemonicPhrase) {
            showToast('Te rugăm să introduci cuvintele mnemonice', 'error');
            return;
        }
        
        try {
            // Verifică dacă cuvintele sunt valide
            const newWallet = ethers.Wallet.fromMnemonic(mnemonicPhrase);
            
            // Salvează noul portofel
            localStorage.setItem('certid-wallet', newWallet.privateKey);
            localStorage.setItem('certid-wallet-mnemonic', mnemonicPhrase);
            
            // Ascunde modalul de restaurare
            document.getElementById('restore-modal').style.display = 'none';
            
            // Reîncarcă pagina pentru a aplica modificările
            showToast('Portofel restaurat cu succes!');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Eroare la restaurarea portofelului:', error);
            showToast('Cuvinte mnemonice invalide. Verifică și încearcă din nou.', 'error');
        }
    });
    
    // Process manual input for ethereum links and EAS links in the wallet page
    safeAddEventListener('process-manual-input', 'click', function() {
        console.log("Process manual input clicked");
        const inputText = document.getElementById('ethereum-link-input');
        if (!inputText) return;
        
        const text = inputText.value.trim();
        
        if (!text) {
            showToast('Te rugăm să introduci un link sau text', 'error');
            return;
        }
        
        // Process the input text based on format
        if (text.toLowerCase().startsWith('ethereum:')) {
            handleEthereumLink(text);
        } else if (text.toLowerCase().includes('easscan.org/attestation/create')) {
            handleEASScanUrl(text); // New handler for EASScan URLs
        } else if (text.startsWith('{') && text.endsWith('}')) {
            try {
                const jsonData = JSON.parse(text);
                if (jsonData.schema) {
                    handleEASJsonConfig(jsonData);
                } else {
                    showToast('JSON format doesn\'t appear to be an EAS config', 'error');
                }
            } catch (error) {
                showToast('Format JSON invalid', 'error');
            }
        } else {
            showToast('Format nerecunoscut. Introduceți un link ethereum:, un link EASScan sau un JSON valid', 'error');
        }
        
        // Clear the input field
        inputText.value = '';
    });
    
    // Verifică dacă există un portofel la încărcarea paginii
    setTimeout(checkWallet, 500); // Short delay to ensure ethers is loaded or fallback is applied

    // Make sure these functions are globally accessible
    window.showToast = showToast;
    window.handleEthereumLink = handleEthereumLink;
    window.signAndSendEthereumTransaction = signAndSendEthereumTransaction;
    
    // Remove deprecated global functions that are no longer needed
    window.attestDocument = function(documentHash, documentTitle) {
        console.log("attestDocument is deprecated, redirecting to signAndSendEthereumTransaction");
        // Check if this is already an ethereum: link
        if (documentHash.startsWith('ethereum:')) {
            return signAndSendEthereumTransaction(documentHash, documentTitle);
        } else {
            // Fallback for backward compatibility - show an error
            showToast('This wallet only supports ethereum: links', 'error');
            return Promise.reject(new Error('This wallet only supports ethereum: links'));
        }
    };

    // Register global handlers for document ready
    window.addEventListener('load', function() {
        console.log('All resources loaded, registering final handlers');
        
        // Check for attest button on the current page and attach event listener if needed
        var attestButton = document.getElementById('attest-button');
        if (attestButton) {
            console.log('Transaction button found, registering handler');
            attestButton.addEventListener('click', function() {
                console.log('Transaction button clicked');
                
                // Show the manual input modal
                const qrModal = document.getElementById('qr-modal');
                if (qrModal) {
                    qrModal.style.display = 'flex';
                    
                    // Focus on input if it exists
                    const input = document.getElementById('ethereum-link-input');
                    if (input) setTimeout(() => input.focus(), 300);
                }
            });
        }
        
        // Make sure close button for QR modal works
        const closeQrModal = document.getElementById('close-qr-modal');
        if (closeQrModal) {
            closeQrModal.addEventListener('click', function() {
                document.getElementById('qr-modal').style.display = 'none';
            });
        }
        
        // Wait to make sure wallet is initialized before attaching WalletConnect handler
        setTimeout(function() {
            const wcButton = document.getElementById('wallet-connect-button');
            if (wcButton) {
                wcButton.addEventListener('click', function() {
                    console.log("WalletConnect button clicked");
                    document.getElementById('walletconnect-modal').style.display = 'flex';
                    
                    // Make sure wallet is available first
                    if (!wallet && typeof initializeWallet === 'function') {
                        console.log("Initializing wallet before WalletConnect");
                        initializeWallet().then(() => {
                            if (window.initializeWalletConnectSession) {
                                window.initializeWalletConnectSession();
                            }
                        });
                    } else {
                        if (window.initializeWalletConnectSession) {
                            window.initializeWalletConnectSession();
                        }
                    }
                });
            }
        }, 1000);
    });
});

// Full WalletConnect implementation - replacing the simulated version
let walletConnectClient = null;
let walletConnectPendingRequests = {};
let qrCodeInterval = null;

// Initialize WalletConnect session
async function initializeWalletConnectSession() {
    try {
        clearQRCodeInterval();
        
        // Reset status
        const statusElement = document.getElementById('walletconnect-status');
        if (statusElement) {
            statusElement.style.display = 'none';
            statusElement.innerHTML = '';
        }
        
        console.log("Initializing WalletConnect session...");
        
        // Display placeholder message
        const qrPlaceholder = document.getElementById('walletconnect-qr-placeholder');
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = '<span>Initializing WalletConnect...</span>';
        }
        
        // Check if WalletConnect Client is available
        if (!window.WalletConnectClient) {
            throw new Error("WalletConnect Client library not loaded. Please check your internet connection.");
        }
        
        // Get current wallet address
        let currentAddress = "0x0000000000000000000000000000000000000000";
        let isWalletAvailable = false;
        
        try {
            if (typeof wallet !== 'undefined' && wallet) {
                currentAddress = wallet.address;
                isWalletAvailable = true;
                console.log("Using wallet address for WalletConnect:", currentAddress);
            } else {
                const savedWallet = localStorage.getItem('certid-wallet');
                if (savedWallet) {
                    try {
                        const recoveredWallet = new ethers.Wallet(savedWallet);
                        currentAddress = recoveredWallet.address;
                        console.log("Recovered wallet address for WalletConnect:", currentAddress);
                        isWalletAvailable = true;
                    } catch (walletError) {
                        console.warn("Could not recover wallet from localStorage:", walletError);
                    }
                }
                
                if (!isWalletAvailable) {
                    throw new Error("No wallet available for WalletConnect. Please create or restore a wallet first.");
                }
            }
        } catch (walletCheckError) {
            console.warn("Error checking wallet availability:", walletCheckError);
            throw new Error("Wallet not available. Please create or restore a wallet first.");
        }
        
        // Create a new WalletConnect connector
        walletConnectClient = new WalletConnectClient.default({
            bridge: "https://bridge.walletconnect.org",
            clientMeta: {
                description: "CertID Web3 Wallet",
                url: "https://certid.app",
                icons: ["https://certid.app/logo.png"],
                name: "CertID Wallet"
            }
        });
        
        // Subscribe to session requests
        walletConnectClient.on("session_request", (error, payload) => {
            console.log("Received session request:", payload);
            if (error) {
                console.error("Session request error:", error);
                throw error;
            }
            
            // Create session approval data with our chain ID and wallet address
            const sessionData = {
                chainId: NETWORK_CONFIG.chainId,
                accounts: [currentAddress]
            };

            // Update UI to show session request
            const { peerMeta } = payload.params[0];
            
            // Update the confirmation modal with session details
            document.getElementById('document-title').textContent = "WalletConnect Session Request";
            document.getElementById('document-hash').textContent = `${peerMeta.name} (${peerMeta.url})`;
            
            const descriptionElement = document.getElementById('confirmation-description');
            if (descriptionElement) {
                descriptionElement.innerHTML = `
                    <strong>${peerMeta.name}</strong> is requesting to connect to your wallet.<br>
                    <span style="font-size: 12px; color: var(--text-tertiary);">${peerMeta.url}</span>
                `;
            }
            
            // Store the session request for later use
            window.currentWalletConnectSessionRequest = {
                approve: () => {
                    try {
                        // Approve the session with our wallet address and chain ID
                        walletConnectClient.approveSession(sessionData);
                        
                        // Update status UI
                        updateWalletConnectStatusUI();
                        
                        // Show success message
                        showToast(`Connected to ${peerMeta.name}`, 'success');
                    } catch (err) {
                        console.error("Error approving session:", err);
                        showToast("Error approving session: " + err.message, 'error');
                    }
                },
                reject: () => {
                    try {
                        // Reject the session
                        walletConnectClient.rejectSession({
                            message: "User rejected the connection"
                        });
                        
                        showToast("Connection rejected", 'info');
                    } catch (err) {
                        console.error("Error rejecting session:", err);
                    }
                }
            };
            
            // Hide WalletConnect modal and show confirmation modal
            document.getElementById('walletconnect-modal').style.display = 'none';
            document.getElementById('confirmation-modal').style.display = 'flex';
        });
        
        // Subscribe to call requests
        walletConnectClient.on("call_request", async (error, payload) => {
            console.log("Received call request:", payload);
            if (error) {
                console.error("Call request error:", error);
                return;
            }
            
            const { method, id, params } = payload;
            
            // Process the request based on method
            try {
                let result;
                let waitForUserConfirmation = false;
                let confirmationData = {};
                
                switch (method) {
                    case 'eth_accounts':
                        // Return the wallet address
                        result = [currentAddress];
                        break;
                        
                    case 'eth_chainId':
                        // Return the chain ID as hex
                        result = '0x' + NETWORK_CONFIG.chainId.toString(16);
                        break;
                        
                    case 'eth_sendTransaction':
                        waitForUserConfirmation = true;
                        confirmationData = {
                            method: 'eth_sendTransaction',
                            params: params,
                            title: "Transaction Request",
                            description: `${walletConnectClient.peerMeta?.name || "dApp"} is requesting to send a transaction`
                        };
                        break;
                        
                    case 'eth_sign':
                    case 'personal_sign':
                        waitForUserConfirmation = true;
                        confirmationData = {
                            method: method,
                            params: params,
                            title: "Sign Message Request",
                            description: `${walletConnectClient.peerMeta?.name || "dApp"} is requesting to sign a message`
                        };
                        break;
                        
                    case 'eth_signTypedData':
                    case 'eth_signTypedData_v4':
                        waitForUserConfirmation = true;
                        confirmationData = {
                            method: method,
                            params: params,
                            title: "Sign Typed Data Request",
                            description: `${walletConnectClient.peerMeta?.name || "dApp"} is requesting to sign typed data`
                        };
                        break;
                        
                    case 'eth_estimateGas':
                        result = await estimateGasForTransaction(params[0]);
                        break;
                        
                    case 'eth_gasPrice':
                        result = await getGasPrice();
                        break;
                        
                    case 'eth_call':
                        result = await readContractData(params[0], params[1] || 'latest');
                        break;
                        
                    case 'net_version':
                        result = NETWORK_CONFIG.chainId.toString();
                        break;
                        
                    case 'wallet_switchEthereumChain':
                        // Only allow switching to our supported chain (Sepolia)
                        if (parseInt(params[0].chainId, 16) !== NETWORK_CONFIG.chainId) {
                            throw new Error(`Chain ID ${parseInt(params[0].chainId, 16)} not supported. Only ${NETWORK_CONFIG.chainId} (${NETWORK_CONFIG.name}) is available.`);
                        }
                        result = null;
                        break;
                        
                    default:
                        throw new Error(`Method ${method} not supported`);
                }
                
                if (waitForUserConfirmation) {
                    // Show confirmation UI to user
                    showWalletConnectConfirmation(id, confirmationData);
                } else {
                    // Respond immediately with result
                    walletConnectClient.approveRequest({
                        id: id,
                        result: result
                    });
                }
                
            } catch (err) {
                console.error(`Error processing ${method} request:`, err);
                
                // Reject the request with error message
                walletConnectClient.rejectRequest({
                    id: id,
                    error: {
                        code: -32603,
                        message: err.message
                    }
                });
                
                showToast(`Error: ${err.message}`, 'error');
            }
        });
        
        // Subscribe to disconnect event
        walletConnectClient.on("disconnect", (error, payload) => {
            console.log("Disconnected from WalletConnect");
            
            if (error) {
                console.error("Disconnect error:", error);
            }
            
            // Reset the UI
            updateWalletConnectStatusUI();
            
            // Show message
            showToast("Disconnected from dApp", 'info');
        });
        
        // Create a new session
        if (!walletConnectClient.connected) {
            await walletConnectClient.createSession();
            
            // Generate and show the QR code with the connection URI
            const uri = walletConnectClient.uri;
            console.log("WalletConnect URI:", uri);
            
            // Display the URI in the input field
            const uriInput = document.getElementById('walletconnect-uri-input');
            if (uriInput) uriInput.value = uri;
            
            // Generate QR code
            generateWalletConnectQR(uri);
        } else {
            console.log("WalletConnect already connected");
            updateWalletConnectStatusUI();
        }
        
    } catch (error) {
        console.error("Error initializing WalletConnect:", error);
        
        // Display error in QR placeholder
        const qrPlaceholder = document.getElementById('walletconnect-qr-placeholder');
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <div style="text-align: center; color: var(--danger);">
                    <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
                    <div style="font-weight: bold; margin-bottom: 5px;">Error initializing WalletConnect</div>
                    <div style="font-size: 12px;">${error.message}</div>
                    <button class="sign-button" style="margin-top: 15px;" 
                        onclick="initializeWalletConnectSession()">Try Again</button>
                </div>
            `;
        }
        
        showToast("Failed to initialize WalletConnect: " + error.message, "error");
    }
}

// Generate QR code for WalletConnect URI
function generateWalletConnectQR(uri) {
    const qrContainer = document.getElementById('walletconnect-qr-placeholder');
    if (!qrContainer) return;
    
    qrContainer.innerHTML = '';
    
    try {
        // Use the QRCode library to generate a QR code
        QRCode.toCanvas(qrContainer, uri, {
            width: 250,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, function (error) {
            if (error) {
                console.error("Error generating QR code:", error);
                qrContainer.innerHTML = '<div style="color: var(--danger);">Error generating QR code</div>';
            }
            
            // Add a caption
            const caption = document.createElement('div');
            caption.style.marginTop = '10px';
            caption.style.fontWeight = '500';
            caption.style.textAlign = 'center';
            caption.textContent = 'Scan with WalletConnect compatible app';
            qrContainer.appendChild(caption);
        });
    } catch (error) {
        console.error("Error generating QR code:", error);
        qrContainer.innerHTML = '<div style="color: var(--danger);">Error generating QR code</div>';
    }
}

// Update the UI to reflect the current WalletConnect state
function updateWalletConnectStatusUI() {
    const status = document.getElementById('walletconnect-status');
    if (!status) return;
    
    const qrContainer = document.getElementById('walletconnect-qr-container');
    
    if (walletConnectClient && walletConnectClient.connected) {
        // Connected - show session info
        const peerMeta = walletConnectClient.peerMeta;
        
        status.innerHTML = `
            <div style="padding: 15px; background-color: #e6ffe6; border-radius: var(--radius); margin-bottom: 15px;">
                <div style="font-weight: 700; margin-bottom: 5px;">✓ Connected</div>
                <strong>dApp:</strong> ${peerMeta?.name || "Unknown dApp"}<br>
                <strong>URL:</strong> ${peerMeta?.url || "-"}<br>
                <strong>Network:</strong> ${NETWORK_CONFIG.name} (Chain ID: ${NETWORK_CONFIG.chainId})
            </div>
            <button class="cancel-button" id="disconnect-walletconnect" style="width: 100%;">Disconnect</button>
        `;
        status.style.display = 'block';
        
        // Hide QR code
        if (qrContainer) qrContainer.style.display = 'none';
        
        // Add disconnect handler
        document.getElementById('disconnect-walletconnect').addEventListener('click', disconnectWalletConnect);
    } else {
        // Not connected - reset UI
        status.innerHTML = '';
        status.style.display = 'none';
        
        // Show QR code
        if (qrContainer) qrContainer.style.display = 'block';
    }
}

// Show WalletConnect request confirmation UI
function showWalletConnectConfirmation(requestId, confirmationData) {
    // Update the confirmation modal
    document.getElementById('document-title').textContent = confirmationData.title;
    
    // Format content based on method
    let content = '';
    switch(confirmationData.method) {
        case 'eth_sendTransaction':
            const txParams = confirmationData.params[0];
            content = `
                <strong>From:</strong> ${formatAddress(txParams.from)}<br>
                <strong>To:</strong> ${formatAddress(txParams.to)}<br>
                ${txParams.value ? `<strong>Value:</strong> ${ethers.utils.formatEther(txParams.value)} ETH<br>` : ''}
                ${txParams.data && txParams.data !== '0x' ? '<strong>Data:</strong> [Contract interaction]' : ''}
            `;
            document.getElementById('document-hash').textContent = JSON.stringify(txParams, null, 2);
            break;
            
        case 'eth_sign':
        case 'personal_sign':
            let message = confirmationData.params[1] || confirmationData.params[0];
            let displayMessage = message;
            
            // Try to convert hex to readable text if applicable
            if (message.startsWith('0x')) {
                try {
                    const bytes = ethers.utils.arrayify(message);
                    const decoded = new TextDecoder().decode(bytes);
                    if (/^[\x20-\x7E]*$/.test(decoded)) { // Check if it contains only printable ASCII
                        displayMessage = decoded;
                    }
                } catch (e) {
                    console.log("Could not convert hex message to text:", e);
                }
            }
            
            content = `<strong>Message:</strong><br>${displayMessage}`;
            document.getElementById('document-hash').textContent = message;
            break;
            
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
            try {
                const typedData = typeof confirmationData.params[1] === 'string' ? 
                    JSON.parse(confirmationData.params[1]) : confirmationData.params[1];
                
                content = `
                    <strong>Domain:</strong> ${typedData.domain?.name || 'Unknown'}<br>
                    <strong>Type:</strong> ${Object.keys(typedData.types)[0] || 'Unknown'}<br>
                    <strong>Signer:</strong> ${formatAddress(confirmationData.params[0])}
                `;
                document.getElementById('document-hash').textContent = JSON.stringify(typedData, null, 2);
            } catch (e) {
                content = '<strong>Typed data signing request</strong>';
                document.getElementById('document-hash').textContent = JSON.stringify(confirmationData.params, null, 2);
            }
            break;
            
        default:
            content = `<strong>${confirmationData.method} request</strong>`;
            document.getElementById('document-hash').textContent = JSON.stringify(confirmationData.params, null, 2);
    }
    
    const descriptionElement = document.getElementById('confirmation-description');
    if (descriptionElement) {
        descriptionElement.innerHTML = `
            ${confirmationData.description}<br>
            ${content}
        `;
    }
    
    // Store the request data
    window.currentWalletConnectRequest = {
        id: requestId,
        method: confirmationData.method,
        params: confirmationData.params,
        approve: async function() {
            try {
                let result;
                
                switch(this.method) {
                    case 'eth_sendTransaction':
                        // Create ethereum: URL from parameters
                        const txParams = this.params[0];
                        let ethereumUrl = `ethereum:${txParams.to}?`;
                        const params = [];
                        if (txParams.data) params.push(`data=${txParams.data}`);
                        if (txParams.value) params.push(`value=${txParams.value}`);
                        if (txParams.gasPrice) params.push(`gasPrice=${txParams.gasPrice}`);
                        if (txParams.gas) params.push(`gasLimit=${txParams.gas}`);
                        ethereumUrl += params.join('&');
                        
                        // Send transaction using our existing function
                        result = await signAndSendEthereumTransaction(
                            ethereumUrl, 
                            `WalletConnect: ${walletConnectClient.peerMeta?.name || "Unknown dApp"}`
                        );
                        break;
                        
                    case 'eth_sign':
                        if (!wallet) throw new Error("Wallet not initialized");
                        result = await wallet.signMessage(
                            ethers.utils.arrayify(this.params[1])
                        );
                        break;
                        
                    case 'personal_sign':
                        if (!wallet) throw new Error("Wallet not initialized");
                        result = await wallet.signMessage(
                            ethers.utils.arrayify(this.params[0])
                        );
                        break;
                        
                    case 'eth_signTypedData':
                    case 'eth_signTypedData_v4':
                        if (!wallet) throw new Error("Wallet not initialized");
                        
                        // Parse the typed data
                        const typedData = typeof this.params[1] === 'string' ? 
                            JSON.parse(this.params[1]) : this.params[1];
                        
                        // Use the ethers _signTypedData method
                        result = await wallet._signTypedData(
                            typedData.domain,
                            typedData.types,
                            typedData.message
                        );
                        break;
                        
                    default:
                        throw new Error(`Method ${this.method} not supported`);
                }
                
                // Approve the request with the result
                walletConnectClient.approveRequest({
                    id: this.id,
                    result: result
                });
                
                return result;
            } catch (err) {
                console.error(`Error approving ${this.method} request:`, err);
                
                // Reject the request with error message
                walletConnectClient.rejectRequest({
                    id: this.id,
                    error: {
                        code: -32603,
                        message: err.message
                    }
                });
                
                throw err;
            }
        },
        reject: function() {
            walletConnectClient.rejectRequest({
                id: this.id,
                error: {
                    code: 4001,
                    message: "User rejected the request"
                }
            });
        }
    };
    
    // Show confirmation modal
    document.getElementById('confirmation-modal').style.display = 'flex';
}

// Connect to WalletConnect using provided URI
function connectToWalletConnect(uri) {
    if (!uri.startsWith('wc:')) {
        showToast('Invalid WalletConnect URI format', 'error');
        return;
    }
    
    console.log("Connecting to WalletConnect with URI:", uri);
    
    try {
        // If there's an active session, disconnect it first
        if (walletConnectClient && walletConnectClient.connected) {
            walletConnectClient.killSession().catch(e => console.error("Error killing session:", e));
        }
        
        // Initialize a new client for this URI
        walletConnectClient = new WalletConnectClient.default({
            uri: uri,
            clientMeta: {
                description: "CertID Web3 Wallet",
                url: "https://certid.app",
                icons: ["https://certid.app/logo.png"],
                name: "CertID Wallet"
            }
        });
        
        // Set up event handlers
        walletConnectClient.on("session_request", (error, payload) => {
            console.log("URI connection - received session request:", payload);
            if (error) {
                console.error("Session request error:", error);
                showToast("Session request error: " + error.message, 'error');
                return;
            }
            
            // Extract peer metadata
            const { peerMeta } = payload.params[0];
            
            // Show session confirmation
            document.getElementById('document-title').textContent = "WalletConnect Session Request";
            document.getElementById('document-hash').textContent = `${peerMeta.name} (${peerMeta.url})`;
            
            const descriptionElement = document.getElementById('confirmation-description');
            if (descriptionElement) {
                descriptionElement.innerHTML = `
                    <strong>${peerMeta.name}</strong> is requesting to connect to your wallet.<br>
                    <span style="font-size: 12px; color: var(--text-tertiary);">${peerMeta.url}</span>
                `;
            }
            
            // Get current wallet address
            let currentAddress = wallet ? wallet.address : "0x0000000000000000000000000000000000000000";
            
            // Store the session request for later
            window.currentWalletConnectSessionRequest = {
                approve: () => {
                    try {
                        // Approve the session with our chain ID and wallet address
                        walletConnectClient.approveSession({
                            chainId: NETWORK_CONFIG.chainId,
                            accounts: [currentAddress]
                        });
                        
                        // Update UI
                        updateWalletConnectStatusUI();
                        
                        // Show success message
                        showToast(`Connected to ${peerMeta.name}`, 'success');
                    } catch (err) {
                        console.error("Error approving session:", err);
                        showToast("Error approving session: " + err.message, 'error');
                    }
                },
                reject: () => {
                    try {
                        // Reject the session
                        walletConnectClient.rejectSession({
                            message: "User rejected the connection"
                        });
                        
                        showToast("Connection rejected", 'info');
                    } catch (err) {
                        console.error("Error rejecting session:", err);
                    }
                }
            };
            
            // Hide WalletConnect modal and show confirmation modal
            document.getElementById('walletconnect-modal').style.display = 'none';
            document.getElementById('confirmation-modal').style.display = 'flex';
        });
        
        // Subscribe to other events
        walletConnectClient.on("call_request", async (error, payload) => {
            // Same call_request handler as before
            // ...existing call_request handler code...
        });
        
        walletConnectClient.on("disconnect", (error, payload) => {
            console.log("Disconnected from WalletConnect");
            
            if (error) {
                console.error("Disconnect error:", error);
            }
            
            // Reset the UI
            updateWalletConnectStatusUI();
            
            // Show message
            showToast("Disconnected from dApp", 'info');
        });
        
        showToast("Connecting to WalletConnect...", 'info');
        
    } catch (error) {
        console.error("Error connecting to WalletConnect:", error);
        showToast(`WalletConnect Error: ${error.message}`, "error");
    }
}

// Disconnect WalletConnect session
function disconnectWalletConnect() {
    if (walletConnectClient && walletConnectClient.connected) {
        console.log("Disconnecting WalletConnect session");
        
        try {
            // Kill the session
            walletConnectClient.killSession()
                .then(() => {
                    console.log("WalletConnect session killed");
                    showToast("Disconnected from dApp", 'info');
                })
                .catch(error => {
                    console.error("Error killing WalletConnect session:", error);
                    showToast("Error disconnecting: " + error.message, 'error');
                });
        } catch (error) {
            console.error("Error disconnecting from WalletConnect:", error);
            showToast("Error disconnecting: " + error.message, 'error');
        }
        
        // Reset UI regardless of errors
        updateWalletConnectStatusUI();
    } else {
        // No active session to disconnect
        console.log("No active WalletConnect session to disconnect");
        
        // Reset the UI anyway
        const status = document.getElementById('walletconnect-status');
        if (status) {
            status.innerHTML = '';
            status.style.display = 'none';
        }
        
        // Show QR code container
        const qrPlaceholder = document.getElementById('walletconnect-qr-placeholder');
        if (qrPlaceholder) {
            qrPlaceholder.style.display = 'block';
            qrPlaceholder.innerHTML = '<span>No active session</span>';
            
            // Add button to start new session
            const reconnectBtn = document.createElement('button');
            reconnectBtn.className = 'sign-button';
            reconnectBtn.style.width = '100%';
            reconnectBtn.style.marginTop = '15px';
            reconnectBtn.textContent = 'Start New Session';
            reconnectBtn.onclick = initializeWalletConnectSession;
            qrPlaceholder.appendChild(reconnectBtn);
        }
    }
}

// Clean up QR code animation interval
function clearQRCodeInterval() {
    if (qrCodeInterval) {
        clearInterval(qrCodeInterval);
        qrCodeInterval = null;
    }
}

// Update the confirm-attestation click handler to handle WalletConnect session requests as well
safeAddEventListener('confirm-attestation', 'click', async function() {
    const documentHash = document.getElementById('document-hash').textContent;
    const documentTitle = document.getElementById('document-title').textContent;
    
    try {
        // Show processing indicator
        document.getElementById('attestation-spinner').style.display = 'block';
        
        console.log("Processing transaction or attestation...");
        
        let txHash;
        
        // Check if this is a WalletConnect session request
        if (window.currentWalletConnectSessionRequest) {
            console.log("Handling as WalletConnect session request");
            
            // Approve the session
            window.currentWalletConnectSessionRequest.approve();
            
            // Clear the request
            window.currentWalletConnectSessionRequest = null;
            
            // Hide confirmation modal
            document.getElementById('confirmation-modal').style.display = 'none';
            document.getElementById('attestation-spinner').style.display = 'none';
            
            return;
        }
        
        // Check if this is a WalletConnect call request
        if (window.currentWalletConnectRequest) {
            console.log("Handling as WalletConnect call request");
            
            try {
                // Approve the request
                const result = await window.currentWalletConnectRequest.approve();
                console.log("WalletConnect request approved with result:", result);
                
                // For transactions, store the hash
                if (window.currentWalletConnectRequest.method === 'eth_sendTransaction') {
                    txHash = result;
                }
                
                // Clear the request
                window.currentWalletConnectRequest = null;
            } catch (error) {
                console.error("Error approving WalletConnect request:", error);
                throw error;
            }
        } 
        // Check if this is an attestWithSig ethereum URL
        else if (window.currentAttestationUrl) {
            console.log("Processing attestWithSig URL:", window.currentAttestationUrl);
            
            // Parse the URL to check if it's an attestWithSig request
            const parsedUrl = parseEthereumUrl(window.currentAttestationUrl);
            
            if (parsedUrl && parsedUrl.method === 'attestWithSig') {
                txHash = await processAttestation(window.currentAttestationUrl);
                window.currentAttestationUrl = null;
            } else {
                // If not attestWithSig, fall back to regular ethereum transaction
                txHash = await signAndSendEthereumTransaction(documentHash, documentTitle);
            }
        }
        // Handle other types of requests
        else if (window.currentEASConfig) {
            console.log("Handling as EAS attestation");
            txHash = await createEASAttestationFromConfig(window.currentEASConfig);
            window.currentEASConfig = null;
        } else if (documentHash.includes("easscan.org/attestation/create")) {
            console.log("Processing EASScan URL");
            await handleEASScanUrl(documentHash);
            document.getElementById('attestation-spinner').style.display = 'none';
            return;
        } else if (documentHash.includes('ethereum:')) {
            console.log("Handling as ethereum transaction");
            
            // Check if it's an attestWithSig URL that wasn't properly parsed earlier
            const parsedUrl = parseEthereumUrl(documentHash);
            
            if (parsedUrl && parsedUrl.method === 'attestWithSig') {
                txHash = await processAttestation(documentHash);
            } else {
                txHash = await signAndSendEthereumTransaction(documentHash, documentTitle);
            }
        } else {
            console.log("Handling as regular attestation");
            txHash = await window.attestDocument(documentHash, documentTitle);
        }
        
        // Hide confirmation modal
        document.getElementById('confirmation-modal').style.display = 'none';
        
        // Show success message
        showToast(`Transaction submitted: ${txHash?.substring(0, 10) || 'Success'}...`, 'success');
        
    } catch (error) {
        // Hide spinner
        document.getElementById('attestation-spinner').style.display = 'none';
        
        console.error('Error processing transaction:', error);
        showToast('Transaction failed: ' + (error.message || "Unknown error"), 'error');
    }
});

// Add new cancel handler to handle WalletConnect session and call requests
safeAddEventListener('cancel-attestation', 'click', function() {
    // Check if there's a WalletConnect session request
    if (window.currentWalletConnectSessionRequest) {
        console.log("Rejecting WalletConnect session request");
        window.currentWalletConnectSessionRequest.reject();
        window.currentWalletConnectSessionRequest = null;
    }
    
    // Check if there's a WalletConnect call request
    if (window.currentWalletConnectRequest) {
        console.log("Rejecting WalletConnect call request");
        window.currentWalletConnectRequest.reject();
        window.currentWalletConnectRequest = null;
    }
    
    // Hide the confirmation modal
    document.getElementById('confirmation-modal').style.display = 'none';
});

// Attach WalletConnect functions to window for global access
window.initializeWalletConnectSession = initializeWalletConnectSession;
window.connectToWalletConnect = connectToWalletConnect;
window.disconnectWalletConnect = disconnectWalletConnect;

