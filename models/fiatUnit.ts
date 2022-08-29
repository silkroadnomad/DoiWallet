import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  CoinDesk: 'CoinDesk',
  Yadio: 'Yadio',
  BitcoinduLiban: 'BitcoinduLiban',
  Exir: 'Exir',
  wazirx: 'wazirx',
} as const;

const RateExtractors = {
  CoinDesk: async (ticker: string): Promise<number> => {
    const api = new Frisbee({ baseURI: 'https://api.coinpaprika.com' });
    const res = await api.get(`/v1/coins/doi-doicoin/ohlcv/latest`);
    console.log('\n Result of COINPAPRIKA Api is: ', res)    

    //doi-doicoin/ohlcv/latest"
    //`/v1/coins/doi-doicoin/ohlcv/historical?start=2021-03-18&quote=usd`
    
   /**  let json;
    try {
      json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    } catch (e) {
      // throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    } */
    let rate = res.body.map((p: FiatUnit) => p.close);
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  Yadio: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.yadio.io/json/${ticker}`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.[ticker]?.price;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  BitcoinduLiban: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch('https://bitcoinduliban.org/api.php?key=lbpusd');
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.[`BTC/${ticker}`];
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  Exir: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch('https://api.exir.io/v1/ticker?symbol=btc-irt');
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.last;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  wazirx: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.wazirx.com/api/v2/tickers/btcinr`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.ticker?.buy; // eslint-disable-line
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
} as const;

type FiatUnit = {
  [key: string]: {
    endPointKey: string;
    symbol: string;
    locale: string;
    source: 'CoinDesk' | 'Yadio' | 'Exir' | 'BitcoinduLiban' | 'wazirx';
  };
};
export const FiatUnit = untypedFiatUnit as FiatUnit;

export async function getFiatRate(ticker: string): Promise<number> {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
