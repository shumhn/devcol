// Helper to safely access program accounts with proper typing workaround
export function getProgramAccount(program: any, accountType: 'user' | 'project' | 'collaborationRequest') {
  return program.account[accountType];
}

import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../hooks/useAnchorProgram';

// PDA helper for project account: seeds = ["project", creator, name]
export function getProjectPDA(creator: PublicKey, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('project'), creator.toBuffer(), Buffer.from(name)],
    PROGRAM_ID,
  );
}
