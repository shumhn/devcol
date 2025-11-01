'use client';

import { useMemo } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import rawIdl from '../idl/devcol_solana.json';
import type { Idl } from '@coral-xyz/anchor';
import type { DeVColProgram } from '../types/program';

// Program ID from your deployed contract
export const PROGRAM_ID = new PublicKey('2PHztUTZuAeWx97sLuezfbmWiyKTzYb986Do2Bh338U7');

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;
    
    return new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      // Some bundlers wrap JSON under .default; normalize it
      const idlJson = (rawIdl as any)?.default ?? (rawIdl as any);
      // Ensure IDL carries current program address; Program signature (idl, provider)
      (idlJson as any).address = PROGRAM_ID.toBase58();
      const prog = new Program(idlJson as Idl, provider as any) as unknown as DeVColProgram;
      // Diagnostics
      try {
        // eslint-disable-next-line no-console
        console.log('[DevCol] Program IDs', {
          PROGRAM_ID: PROGRAM_ID.toBase58(),
          idlAddress: (idlJson as any).address,
          programIdRuntime: (prog as any).programId?.toBase58?.(),
        });
      } catch {}
      return prog;
    } catch (e) {
      console.error('Failed to init Anchor Program:', e);
      return null;
    }
  }, [provider]);

  return { program, provider, wallet };
}

// Helper functions to derive PDAs
export function getUserPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getProjectPDA(creator: PublicKey, projectName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('project'), creator.toBuffer(), Buffer.from(projectName)],
    PROGRAM_ID
  );
}

export function getCollabRequestPDA(sender: PublicKey, project: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collab_request'), sender.toBuffer(), project.toBuffer()],
    PROGRAM_ID
  );
}
