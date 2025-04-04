import { EAS, SchemaEncoder, NO_EXPIRATION } from '@ethereum-attestation-service/eas-sdk';

// Constants for the Sepolia testnet EAS deployment
export const EAS_CONTRACT_ADDRESS = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
export const SCHEMA_UID = "0x940a0f0b3280c5b67e09aaab239f62e2eb9af35ae50dab4eb45fa552e8e8bf60";
export const SCHEMA_STRING = "address authorAddress,string authorName,string articleTitle,string articleHash,uint256 timestamp,string[] tags";

/**
 * Initialize the EAS SDK with a signer
 * @param {ethers.Signer} signer - An ethers.js Signer object
 * @returns {Promise<EAS>} - An initialized EAS instance
 */
export const initializeEAS = async (signer) => {
  if (!signer) {
    throw new Error("Signer is required");
  }
  
  const eas = new EAS(EAS_CONTRACT_ADDRESS);
  await eas.connect(signer);
  return eas;
};

/**
 * Create an attestation using the EAS SDK
 * @param {EAS} eas - An initialized EAS instance
 * @param {object} data - The attestation data
 * @param {string} data.authorAddress - The author's Ethereum address
 * @param {string} data.authorName - The author's name
 * @param {string} data.articleTitle - The article title
 * @param {string} data.articleHash - The article hash (IPFS CID or content hash)
 * @param {string} data.timestamp - The timestamp in seconds
 * @param {string[]} data.tags - Array of tags
 * @returns {Promise<string>} - The attestation UID
 */
export const createAttestation = async (eas, data) => {
  if (!eas) {
    throw new Error("EAS instance is required");
  }
  
  // Create the SchemaEncoder with the schema string
  const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
  
  // Encode the data
  const encodedData = schemaEncoder.encodeData([
    { name: "authorAddress", value: data.authorAddress, type: "address" },
    { name: "authorName", value: data.authorName, type: "string" },
    { name: "articleTitle", value: data.articleTitle, type: "string" },
    { name: "articleHash", value: data.articleHash, type: "string" },
    { name: "timestamp", value: data.timestamp.toString(), type: "uint256" },
    { name: "tags", value: data.tags, type: "string[]" }
  ]);
  
  // Create the attestation
  const tx = await eas.attest({
    schema: SCHEMA_UID,
    data: {
      recipient: "0x0000000000000000000000000000000000000000", // No specific recipient
      expirationTime: NO_EXPIRATION,
      revocable: false,
      data: encodedData
    }
  });
  
  // Wait for the transaction to be confirmed
  const uid = await tx.wait();
  return uid;
};

/**
 * Get the URL for viewing an attestation on EAS Explorer
 * @param {string} uid - The attestation UID
 * @returns {string} - The URL
 */
export const getAttestationUrl = (uid) => {
  return `https://sepolia.easscan.org/attestation/view/${uid}`;
};

/**
 * Get the URL for viewing a transaction on Etherscan
 * @param {string} txHash - The transaction hash
 * @returns {string} - The URL
 */
export const getTransactionUrl = (txHash) => {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
};