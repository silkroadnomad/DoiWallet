import { Chain } from './doichainUnits';

export interface NameOp {
  name: string;
  value: string;
  operation?: string;
}

export interface NamecoinNameOp extends NameOp {
  op: string;
}

export interface DoichainNameOp extends NameOp {
  name: string;
  value: string;
}

export interface ScriptPubKey {
  nameOp?: Map<string, string | number> | NamecoinNameOp | DoichainNameOp[];
  addresses?: string[];
  hex: string;
  asm: string;
  reqSigs?: number;
  type: string;
}

export interface TransactionOutput {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}
