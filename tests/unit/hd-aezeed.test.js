import assert from 'assert';

import { HDAezeedWallet, WatchOnlyWallet } from '../../class';

describe('HDAezeedWallet', () => {
  it('can import mnemonics and generate addresses and WIFs', async function () {
    const aezeed = new HDAezeedWallet();

    aezeed.setSecret('bs');
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    // correct pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase('strongPassword');
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    // no pass but its required:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase();
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(await aezeed.mnemonicInvalidPassword());

    // wrong pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase('badpassword');
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(await aezeed.mnemonicInvalidPassword());

    aezeed.setSecret(
      'able concert slush lend olive cost wagon dawn board robot park snap dignity churn fiction quote shrimp hammer wing jump immune skill sunset west',
    );
    aezeed.setPassphrase();
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    aezeed.setSecret(
      'able concert slush lend olive cost wagon dawn board robot park snap dignity churn fiction quote shrimp hammer wing jump immune skill sunset west',
    );
    aezeed.setPassphrase('aezeed');
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    aezeed.setPassphrase();
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    assert.strictEqual(
      aezeed.getXpub(),
      'zpub6rkAmx9z6PmK7tBpGQatqpRweZvRw7uqiEMRS9KuZA9VFKUSoz3GQeJFtRQsQwduWugh5mGHro1tGnt78ci9AiB8qEH4hCRBWxdMaxadGVy',
    );

    let address = aezeed._getExternalAddressByIndex(0);
    assert.strictEqual(address, "dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx");
    assert.ok(aezeed.getAllExternalAddresses().includes('dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx'));

    address = aezeed._getExternalAddressByIndex(1);
    assert.strictEqual(address, "dc1qswr3s4fylskqn9vemef8l28qukshuags9y2epv");
    assert.ok(aezeed.getAllExternalAddresses().includes('dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx'));

    address = aezeed._getInternalAddressByIndex(0);
    assert.strictEqual(address, "dc1qzyjq8sjj56n8v9fgw5klsc8sq8yuy0jxchv4z5");

    let wif = aezeed._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'Tf3YRDb4bWqmMu7beAQUhqJEMmGcQB5EKtZh3LEwW8akQm6yk2FW');

    wif = aezeed._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'ThnSg67JrUzKiDKkHUxA9euRceeWz7NTuoqJYUnPHdGQaD7DLmHw');

    assert.strictEqual(aezeed.getIdentityPubkey(), '0384b9a7158320e828280075224af324931ca9d6de4334f724dbb553ffee447164');

    // we should not really test private methods, but oh well
    assert.strictEqual(
      aezeed._getNodePubkeyByIndex(0, 0).toString('hex'),
      '03ed28668d446c6e2ac11e4848f7afd894761ad26569baa8a16adff723699f2c07',
    );
    assert.strictEqual(
      aezeed._getNodePubkeyByIndex(1, 0).toString('hex'),
      '0210791263114fe72ab5a2131ca1986b84c62a93e30ee9d509266f1eadf4febaf2',
    );
    assert.strictEqual(
      aezeed._getPubkeyByAddress(aezeed._getExternalAddressByIndex(1)).toString('hex'),
      aezeed._getNodePubkeyByIndex(0, 1).toString('hex'),
    );
    assert.strictEqual(
      aezeed._getPubkeyByAddress(aezeed._getInternalAddressByIndex(1)).toString('hex'),
      aezeed._getNodePubkeyByIndex(1, 1).toString('hex'),
    );
  });

  it('watch-only from zpub produces correct addresses', async () => {
    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    assert.strictEqual(
      aezeed.getXpub(),
      'zpub6rkAmx9z6PmK7tBpGQatqpRweZvRw7uqiEMRS9KuZA9VFKUSoz3GQeJFtRQsQwduWugh5mGHro1tGnt78ci9AiB8qEH4hCRBWxdMaxadGVy',
    );

    const address = aezeed._getExternalAddressByIndex(0);
    assert.strictEqual(address, "dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx");
    assert.ok(aezeed.getAllExternalAddresses().includes('dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx'));

    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret(aezeed.getXpub());
    watchOnly.init();
    assert.strictEqual(watchOnly._getExternalAddressByIndex(0), aezeed._getExternalAddressByIndex(0));
    assert.ok(watchOnly.weOwnAddress('dc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xncuuxx'));
    assert.ok(!watchOnly.weOwnAddress('garbage'));
    assert.ok(!watchOnly.weOwnAddress(false));
  });

  it('can sign and verify messages', async () => {
    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));
    let signature;

    // external address
    signature = aezeed.signMessage('vires is numeris', aezeed._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'J9zF7mdGGdc/9HMlvor6Zl7ap1qseQpiBDJ4oaSpkzbQGGhdfkM6LHo6m9BV8o/BlqiQI1vuODaNlBFyeyIWgfE=');
    assert.strictEqual(aezeed.verifyMessage('vires is numeris', aezeed._getExternalAddressByIndex(0), signature), true);

    // internal address
    signature = aezeed.signMessage('vires is numeris', aezeed._getInternalAddressByIndex(0));
    assert.strictEqual(signature, 'KIda06aSswmo9NiAYNUBRADA9q1v39raSmHHVg56+thtah5xL7hVw/x+cZgydFNyel2bXfyGluJRaP1uRQfJtzo=');
    assert.strictEqual(aezeed.verifyMessage('vires is numeris', aezeed._getInternalAddressByIndex(0), signature), true);
  });
});
