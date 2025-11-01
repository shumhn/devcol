// Helper to safely access program accounts with proper typing workaround
export function getProgramAccount(program: any, accountType: 'user' | 'project' | 'collaborationRequest') {
  return program.account[accountType];
}

import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../hooks/useAnchorProgram';

// PDA helper for project account: seeds = ["project", creator, name]
export async function getProjectPDA(creator: PublicKey, name: string): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('project'), creator.toBuffer(), Buffer.from(name)],
    PROGRAM_ID,
  );
}
