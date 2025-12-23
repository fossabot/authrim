/**
 * Pairwise Subject Identifier Utilities
 * OIDC Core 8.1: Pairwise Identifier Algorithm
 * https://openid.net/specs/openid-connect-core-1_0.html#PairwiseAlg
 */
/**
 * Generates a pairwise subject identifier for a user and client
 *
 * OIDC Core 8.1: A pairwise subject identifier is computed using a
 * sector identifier and a local account ID. This prevents clients from
 * correlating users across different RPs.
 *
 * @param localAccountId - The user's internal identifier (e.g., database ID)
 * @param sectorIdentifier - The sector identifier (usually the client's host)
 * @param salt - A secret salt for additional security
 * @returns Base64url-encoded SHA-256 hash as the pairwise subject identifier
 */
export declare function generatePairwiseSubject(
  localAccountId: string,
  sectorIdentifier: string,
  salt: string
): Promise<string>;
/**
 * Extracts the sector identifier from a redirect URI
 *
 * OIDC Core 8.1: The sector identifier is the host component of the
 * redirect_uri. When multiple redirect URIs are registered, they must
 * all have the same host, or a sector_identifier_uri must be provided.
 *
 * @param redirectUri - The client's redirect URI
 * @returns The sector identifier (host)
 */
export declare function extractSectorIdentifier(redirectUri: string): string;
/**
 * Validates that all redirect URIs have the same sector identifier
 *
 * @param redirectUris - Array of redirect URIs
 * @returns true if all URIs have the same sector, false otherwise
 */
export declare function validateSectorIdentifierConsistency(redirectUris: string[]): boolean;
/**
 * Determines the effective sector identifier for a client
 *
 * OIDC Core 8.1: If sector_identifier_uri is provided, use the host from that.
 * Otherwise, use the host from the redirect_uri.
 *
 * @param redirectUris - Client's registered redirect URIs
 * @param sectorIdentifierUri - Optional sector identifier URI
 * @returns The sector identifier to use for pairwise subject generation
 */
export declare function determineEffectiveSectorIdentifier(
  redirectUris: string[],
  sectorIdentifierUri?: string
): string;
/**
 * Generates the subject identifier based on the client's subject type
 *
 * @param localAccountId - The user's internal identifier
 * @param subjectType - 'public' or 'pairwise'
 * @param sectorIdentifier - The sector identifier (required for pairwise)
 * @param salt - Secret salt (required for pairwise)
 * @returns The subject identifier to use in tokens
 */
export declare function generateSubjectIdentifier(
  localAccountId: string,
  subjectType: 'public' | 'pairwise',
  sectorIdentifier?: string,
  salt?: string
): Promise<string>;
//# sourceMappingURL=pairwise.d.ts.map
