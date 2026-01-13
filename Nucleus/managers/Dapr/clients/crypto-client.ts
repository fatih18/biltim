/**
 * Cryptography client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { createCryptoError, safeExecute } from "../error-handling";
import type { CryptoOptions, DaprLogger } from "../types";
import { validateRequired } from "../utils";

export class DaprCryptoClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Encrypt data using a Dapr crypto component
	 */
	public async encrypt(
		data: Buffer | string,
		options: CryptoOptions,
	): Promise<Buffer> {
		validateRequired(
			{ data, componentName: options.componentName },
			["data", "componentName"],
			"crypto encrypt",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Encrypting data", {
					componentName: options.componentName,
					keyName: options.keyName,
					keyWrapAlgorithm: options.keyWrapAlgorithm,
				});

				const client = await this.client();

				// Convert string to Buffer if needed
				const inputData = typeof data === "string" ? Buffer.from(data) : data;

				// Use type assertion to bypass strict typing requirements
				// The Dapr JS SDK expects specific types but doesn't export them properly
				// biome-ignore lint/suspicious/noExplicitAny: <>
				const cryptoOptions: any = {
					componentName: options.componentName,
				};

				// Add optional properties only if they are defined
				if (options.keyName) {
					cryptoOptions.keyName = options.keyName;
				}

				if (options.keyWrapAlgorithm) {
					cryptoOptions.keyWrapAlgorithm = options.keyWrapAlgorithm;
				}

				const encryptedData = await client.crypto.encrypt(
					inputData,
					cryptoOptions,
				);

				this.logger.debug("Data encrypted successfully", {
					componentName: options.componentName,
					inputSize: inputData.length,
					outputSize: encryptedData.length,
				});

				return encryptedData;
			},
			(message, details) =>
				createCryptoError(`Failed to encrypt data: ${message}`, details),
		);
	}

	/**
	 * Decrypt data using a Dapr crypto component
	 */
	public async decrypt(
		data: Buffer | string,
		options: CryptoOptions,
	): Promise<Buffer> {
		validateRequired(
			{ data, componentName: options.componentName },
			["data", "componentName"],
			"crypto decrypt",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Decrypting data", {
					componentName: options.componentName,
				});

				const client = await this.client();

				// Convert string to Buffer if needed
				const inputData = typeof data === "string" ? Buffer.from(data) : data;

				// Use type assertion to bypass strict typing requirements
				// The Dapr JS SDK expects specific types but doesn't export them properly
				// biome-ignore lint/suspicious/noExplicitAny: <>
				const cryptoOptions: any = {
					componentName: options.componentName,
				};

				// Add optional properties only if they are defined
				if (options.keyName) {
					cryptoOptions.keyName = options.keyName;
				}

				if (options.keyWrapAlgorithm) {
					cryptoOptions.keyWrapAlgorithm = options.keyWrapAlgorithm;
				}

				const decryptedData = await client.crypto.decrypt(
					inputData,
					cryptoOptions,
				);

				this.logger.debug("Data decrypted successfully", {
					componentName: options.componentName,
					inputSize: inputData.length,
					outputSize: decryptedData.length,
				});

				return decryptedData;
			},
			(message, details) =>
				createCryptoError(`Failed to decrypt data: ${message}`, details),
		);
	}

	/**
	 * Encrypt a string and return a base64 encoded string
	 */
	public async encryptString(
		plaintext: string,
		options: CryptoOptions,
	): Promise<string> {
		const encryptedBuffer = await this.encrypt(plaintext, options);
		return encryptedBuffer.toString("base64");
	}

	/**
	 * Decrypt a base64 encoded string and return the original string
	 */
	public async decryptString(
		ciphertext: string,
		options: CryptoOptions,
	): Promise<string> {
		// Convert base64 string to buffer
		const encryptedBuffer = Buffer.from(ciphertext, "base64");
		const decryptedBuffer = await this.decrypt(encryptedBuffer, options);
		return decryptedBuffer.toString("utf-8");
	}
}
