/**
 * Helper library for processing EAS attestations
 */

// Keep a reference to the EAS class
let EASClass;

// Initialize EAS when the document loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for globally available EAS
    if (window.EAS) {
        EASClass = window.EAS;
        console.log("EAS class initialized from global EAS");
    } else if (window.eas && window.eas.EAS) {
        EASClass = window.eas.EAS;
        console.log("EAS class initialized from global eas.EAS");
    } else {
        console.warn("EAS SDK not detected. Will attempt to load dynamically when needed.");
    }
});

/**
 * Parse an Ethereum URL, handling special case for attestWithSig
 * @param {string} url - Ethereum URL to parse
 * @returns {Object} Parsed URL components
 */
function parseEthereumAttestationUrl(url) {
    // Special case for attestWithSig that might have a / in the address
    if (url.includes('/attestWithSig')) {
        try {
            // Extract the base parts
            const [ethereumPart, querySuffix] = url.split('?');
            const address = ethereumPart.replace('ethereum:', '').replace('/attestWithSig', '');
            const method = 'attestWithSig';
            
            // Parse params
            let params = {};
            if (querySuffix) {
                const searchParams = new URLSearchParams('?' + querySuffix);
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
        } catch (error) {
            console.error("Error parsing attestWithSig URL:", error);
            throw new Error("Invalid attestWithSig URL format");
        }
    }
    
    return null;
}

/**
 * Process an EAS attestation using the EAS SDK
 * @param {string} url - Ethereum attestWithSig URL
 * @param {Object} wallet - Ethers.js wallet instance
 * @param {Object} config - Network configuration
 * @returns {Promise<string>} Transaction hash
 */
async function processEASAttestation(url, wallet, config) {
    // Parse the URL
    const parsed = parseEthereumAttestationUrl(url);
    if (!parsed) {
        throw new Error("Not an EAS attestation URL");
    }
    
    const { address, method, params } = parsed;
    
    // Check requirements
    if (method !== 'attestWithSig') {
        throw new Error(`Unsupported method: ${method}`);
    }
    
    if (!wallet) {
        throw new Error("Wallet not initialized");
    }
    
    // Get the EAS contract address and schema UID
    const EAS_CONTRACT_ADDRESS = address;
    const SCHEMA_UID = params.uint256;
    
    if (!SCHEMA_UID) {
        throw new Error("Missing schema UID in parameters");
    }
    
    console.log("Processing EAS attestation with:", {
        address: EAS_CONTRACT_ADDRESS,
        method,
        schemaUID: SCHEMA_UID,
        recipient: params.address || "0x0000000000000000000000000000000000000000"
    });
    
    // Try to get the EAS class
    if (!EASClass) {
        try {
            // Try to import dynamically
            const EASModule = await import("https://cdn.skypack.dev/@ethereum-attestation-service/eas-sdk@0.28.0");
            EASClass = EASModule.EAS;
        } catch (error) {
            console.error("Failed to import EAS SDK:", error);
            throw new Error("Could not load EAS SDK");
        }
    }
    
    // Create an EAS client instance
    const eas = new EASClass(EAS_CONTRACT_ADDRESS);
    eas.connect(wallet);
    
    // Format recipient address
    const recipient = params.address || "0x0000000000000000000000000000000000000000";
    
    // If address is not in hex format, we need to handle it
    const recipientAddress = recipient.startsWith('0x') ? 
        recipient : 
        "0x0000000000000000000000000000000000000000"; // Use zero address if not a valid hex address
    
    // Encode the attestation data
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
    
    // Create the attestation request
    const attestationRequest = {
        schema: SCHEMA_UID,
        data: {
            recipient: recipientAddress,
            expirationTime: ethers.BigNumber.from(0),
            revocable: false,
            refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
            data: encodedData,
            value: ethers.utils.parseEther("0")
        }
    };
    
    try {
        // Submit the attestation transaction
        const tx = await eas.attest(attestationRequest);
        console.log("Attestation transaction sent:", tx.hash);
        return tx.hash;
    } catch (error) {
        console.error("Error submitting attestation:", error);
        throw error;
    }
}

// Export functions for use in other scripts
window.parseEthereumAttestationUrl = parseEthereumAttestationUrl;
window.processEASAttestation = processEASAttestation;
