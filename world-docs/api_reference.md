> ## Documentation Index
> Fetch the complete documentation index at: https://docs.world.org/llms.txt
> Use this file to discover all available pages before exploring further.

# Verify

> Verifies World ID 4.0 proofs and legacy 3.0 proofs. Use `rp_id` (`rp_...`) when possible; `app_id` (`app_...`) is still accepted for backward compatibility.



## OpenAPI

````yaml /openapi/developer-portal.json post /api/v4/verify/{rp_id}
openapi: 3.0.3
info:
  title: Developer Portal API
  version: 1.0.0
  description: >-
    OpenAPI reference for Developer Portal endpoints used across Mini Apps and
    World ID.
servers:
  - url: https://developer.world.org
    description: Primary
  - url: https://developer.worldcoin.org
    description: Legacy domain
  - url: https://staging-developer.worldcoin.org
    description: Staging domain
security: []
paths:
  /api/v4/verify/{rp_id}:
    post:
      summary: Verify
      description: >-
        Verifies World ID 4.0 proofs and legacy 3.0 proofs. Use `rp_id`
        (`rp_...`) when possible; `app_id` (`app_...`) is still accepted for
        backward compatibility.
      parameters:
        - name: rp_id
          in: path
          required: true
          schema:
            type: string
          description: >-
            RP ID (`rp_...`) is recommended. App ID (`app_...`) is also accepted
            for backward compatibility.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyV4Request'
            examples:
              uniqueness_v3:
                summary: Uniqueness proof (protocol 3.0)
                value:
                  protocol_version: '3.0'
                  nonce: '0xabc123'
                  action: my_action
                  responses:
                    - identifier: orb
                      merkle_root: >-
                        0x2264a66d162d7893e12ea8e3c072c51e785bc085ad655f64c10c1a61e00f0bc2
                      nullifier: >-
                        0x2bf8406809dcefb1486dadc96c0a897db9bab002053054cf64272db512c6fbd8
                      proof: >-
                        0x1aa8b8f3b2d2de5ff452c0e1a83e29d6bf46fb83ef35dc5957121ff3d3698a1119090fb...
                      signal_hash: >-
                        0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4
                      max_age: 304200
                  environment: production
              uniqueness_v4:
                summary: Uniqueness proof (protocol 4.0)
                value:
                  protocol_version: '4.0'
                  nonce: '0xabc123'
                  action: my_action
                  responses:
                    - identifier: orb
                      issuer_schema_id: 1
                      nullifier: >-
                        0x2bf8406809dcefb1486dadc96c0a897db9bab002053054cf64272db512c6fbd8
                      expires_at_min: 49012345
                      proof:
                        - '0x111'
                        - '0x222'
                        - '0x333'
                        - '0x444'
                        - '0x555'
                      signal_hash: '0x0'
              session_v4:
                summary: Session proof (protocol 4.0)
                value:
                  protocol_version: '4.0'
                  nonce: '0xabc123'
                  session_id: '1234567890123456789'
                  responses:
                    - identifier: orb
                      issuer_schema_id: 1
                      session_nullifier:
                        - '0xaaa'
                        - '0xbbb'
                      expires_at_min: 49012345
                      proof:
                        - '0x111'
                        - '0x222'
                        - '0x333'
                        - '0x444'
                        - '0x555'
      responses:
        '200':
          description: At least one proof verified successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyV4SuccessResponse'
        '400':
          description: Validation or verification error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyV4ErrorResponse'
              examples:
                app_not_migrated:
                  value:
                    success: false
                    code: app_not_migrated
                    detail: >-
                      This app has not been migrated to World ID 4.0. Please use
                      the v2 verify endpoint.
                all_verifications_failed:
                  value:
                    success: false
                    code: all_verifications_failed
                    detail: All proof verifications failed.
                    results:
                      - identifier: orb
                        success: false
                        code: verification_error
                        detail: On-chain proof verification failed.
        '404':
          description: App not found or no longer active
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyV4ErrorResponse'
components:
  schemas:
    VerifyV4Request:
      description: Choose one request type.
      oneOf:
        - title: Legacy Proofs (v3)
          allOf:
            - $ref: '#/components/schemas/VerifyV4LegacyProofRequest'
        - title: Uniqueness Proofs
          allOf:
            - $ref: '#/components/schemas/VerifyV4UniquenessProofRequest'
        - title: Session Proofs
          allOf:
            - $ref: '#/components/schemas/VerifyV4SessionProofRequest'
    VerifyV4SuccessResponse:
      type: object
      required:
        - success
        - results
      properties:
        success:
          type: boolean
          enum:
            - true
        action:
          type: string
        nullifier:
          type: string
        created_at:
          type: string
          format: date-time
        environment:
          type: string
          enum:
            - production
            - staging
        session_id:
          type: string
        results:
          type: array
          items:
            $ref: '#/components/schemas/VerifyV4Result'
        message:
          type: string
    VerifyV4ErrorResponse:
      type: object
      required:
        - success
        - code
        - detail
      properties:
        success:
          type: boolean
          enum:
            - false
        code:
          type: string
        detail:
          type: string
        results:
          type: array
          items:
            $ref: '#/components/schemas/VerifyV4Result'
    VerifyV4LegacyProofRequest:
      title: Legacy Proofs (v3)
      type: object
      required:
        - protocol_version
        - nonce
        - action
        - responses
      description: Legacy uniqueness proof format (protocol 3.0).
      properties:
        protocol_version:
          type: string
          enum:
            - '3.0'
        nonce:
          type: string
        action:
          type: string
        action_description:
          type: string
        environment:
          type: string
          enum:
            - production
            - staging
          default: production
        responses:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/VerifyV4ResponseItemV3'
    VerifyV4UniquenessProofRequest:
      title: Uniqueness Proofs
      type: object
      required:
        - protocol_version
        - nonce
        - action
        - responses
      description: Standard uniqueness proof format (protocol 4.0).
      properties:
        protocol_version:
          type: string
          enum:
            - '4.0'
        nonce:
          type: string
        action:
          type: string
        action_description:
          type: string
        environment:
          type: string
          enum:
            - production
            - staging
          default: production
        responses:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/VerifyV4ResponseItemV4'
    VerifyV4SessionProofRequest:
      title: Session Proofs
      type: object
      required:
        - protocol_version
        - nonce
        - session_id
        - responses
      description: Session proof format (protocol 4.0).
      properties:
        protocol_version:
          type: string
          enum:
            - '4.0'
        nonce:
          type: string
        session_id:
          type: string
        environment:
          type: string
          enum:
            - production
            - staging
          default: production
        responses:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/VerifyV4SessionResponseItem'
    VerifyV4Result:
      type: object
      properties:
        identifier:
          type: string
        success:
          type: boolean
        nullifier:
          type: string
        code:
          type: string
        detail:
          type: string
    VerifyV4ResponseItemV3:
      type: object
      required:
        - identifier
        - proof
        - merkle_root
        - nullifier
      properties:
        identifier:
          type: string
          description: Credential type (e.g. orb).
        signal_hash:
          type: string
          default: '0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4'
        merkle_root:
          type: string
        nullifier:
          type: string
        proof:
          type: string
        max_age:
          type: integer
          minimum: 3600
          maximum: 604800
    VerifyV4ResponseItemV4:
      type: object
      required:
        - identifier
        - issuer_schema_id
        - nullifier
        - expires_at_min
        - proof
      properties:
        identifier:
          type: string
        signal_hash:
          type: string
          default: '0x0'
        issuer_schema_id:
          type: integer
        nullifier:
          type: string
        expires_at_min:
          type: integer
        credential_genesis_issued_at_min:
          type: integer
        proof:
          type: array
          minItems: 5
          maxItems: 5
          items:
            type: string
          description: Exactly 5 hex elements (4 compressed proof elements + Merkle root).
    VerifyV4SessionResponseItem:
      type: object
      required:
        - identifier
        - issuer_schema_id
        - session_nullifier
        - expires_at_min
        - proof
      properties:
        identifier:
          type: string
        signal_hash:
          type: string
          default: '0x0'
        issuer_schema_id:
          type: integer
        session_nullifier:
          type: array
          minItems: 2
          maxItems: 2
          items:
            type: string
          description: Tuple `[nullifier, action]`.
        expires_at_min:
          type: integer
        credential_genesis_issued_at_min:
          type: integer
        proof:
          type: array
          minItems: 5
          maxItems: 5
          items:
            type: string

````

Built with [Mintlify](https://mintlify.com).
