// World ID constants and types

export interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

export const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || '';
export const WORLD_ACTION = 'verify-human';

export const isDevMode = (): boolean => {
  return process.env.NEXT_PUBLIC_DEV_MOCK_WORLDID === 'true';
};
