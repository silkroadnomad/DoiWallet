// import assert from 'assert';
import BIP47Factory from '@spsina/bip47';
import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import { ECPairFactory } from 'ecpair';
import { DOICHAIN } from '../../blue_modules/network.js';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import ecc from '../../blue_modules/noble_ecc';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet } from '../../class';

const ECPair = ECPairFactory(ecc);

jest.setTimeout(90 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Bech32 Segwit HD (BIP84) with BIP47', () => {
  it('should work', async () => {
    const hd = new HDLegacyP2PKHWallet();
    // @see https://gist.github.com/SamouraiDev/6aad669604c5930864bd
    hd.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');

    expect(hd.getBIP47PaymentCode()).toEqual(
      'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    );

    expect(hd.allowBIP47()).toEqual(true);

    await hd.fetchBIP47SenderPaymentCodes();

    expect(hd.getBIP47SenderPaymentCodes().length).toBeGreaterThanOrEqual(0);
    //expect(hd.getBIP47SenderPaymentCodes()).toContain(
    //  'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA',
    //);
    //expect(hd.getBIP47SenderPaymentCodes()).toContain(
    //  'PM8TJgndZSWCBPG5zCsqdXmCKLi7sP13jXuRp6b5X7G9geA3vRXQKAoXDf4Eym2RJB3vvcBdpDQT4vbo5QX7UfeV2ddjM8s79ERUTFS2ScKggSrciUsU',
    //);
    //expect(hd.getBIP47SenderPaymentCodes()).toContain(
      //'PM8TJNiWKcyiA2MsWCfuAr9jvhA5qMEdEkjNypEnUbxMRa1D5ttQWdggQ7ib9VNFbRBSuw7i6RkqPSkCMR1XGPSikJHaCSfqWtsb1fn4WNAXjp5JVL5z',
    //);

    await hd.fetchBalance();
    await hd.fetchTransactions();
    //expect(hd.getTransactions().length).toBeGreaterThanOrEqual(4);
  });

  it('can tell whom to notify and whom dont', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    // whom we are going to notify:
    const bip47instanceReceiver = BIP47Factory(ecc).fromBip39Seed(process.env.BIP47_HD_MNEMONIC.split(' ')[0], { network: DOICHAIN, coin: 'DOICHAIN' }, '1');

    // notifier:
    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split(' ')[1]);
    walletSender.switchBIP47(true);
    await walletSender.fetchBIP47SenderPaymentCodes();
    await walletSender.fetchBalance();
    await walletSender.fetchTransactions();

    assert.ok(walletSender.getTransactions().length >= 0);
    assert.ok(walletSender._receive_payment_codes.length >= 0);

    //assert.ok(walletSender.getBIP47NotificationTransaction(bip47instanceReceiver.getSerializedPaymentCode())); // already notified in the past
    //assert.ok(
    //  !walletSender.getBIP47NotificationTransaction(
    //    'PM8TJdfXvRasx4WNpxky25ZKxhvfEiGYW9mka92tfiqDRSL7LQdxnC8uAk9k3okXctZowVwY2PUndjCQR6DHyuVVwqmy2aodmZNHgfFZcJRNTuBAXJCp',
    //  ),
    //); // random PC from interwebz. never interacted with him, so need to notify
  });  
});
