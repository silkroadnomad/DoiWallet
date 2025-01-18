export const VERSION = 0x7100;

export const BITCOIN_MAINNET = {
  name: 'bitcoin-mainnet',
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128,
};

export const NAMECOIN_MAINNET = {
  name: 'namecoin-mainnet',
  messagePrefix: '\x18Namecoin Signed Message:\n',
  bech32: 'nc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 52,
  scriptHash: 13,
  wif: 180,
};

export const DOICHAIN_MAINNET = {
  name: 'mainnet',
  messagePrefix: '\x19Doichain Signed Message:\n',
  bech32: 'dc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0499ade4,
  },
  pubKeyHash: 52, // D=30 d=90 (52=M) https://en.bitcoin.it/wiki/List_of_address_prefixes
  scriptHash: 13,
  wif: 180,
};

export const DOICHAIN_TESTNET = {
  name: 'testnet',
  messagePrefix: '\x19Doichain-Testnet Signed Message:\n',
  bech32: 'td',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 111, // D=30 d=90 (52=N) (111=m/n) https://en.bitcoin.it/wiki/List_of_address_prefixes
  scriptHash: 196,
  wif: 239,
};
export const DOICHAIN_REGTEST = {
  name: 'regtest',
  messagePrefix: '\x19Doichain-Regtest Signed Message:\n',
  bech32: 'ncrt',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239,
};

export const DOICHAIN = DOICHAIN_MAINNET;
