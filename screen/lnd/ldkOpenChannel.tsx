import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { DoichainUnit } from '../../models/doichainUnits';
import { Psbt } from 'bitcoinjs-lib';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { btcToSatoshi, fiatToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueDismissKeyboardInputAccessory, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import { HDSegwitBech32Wallet, LightningLdkWallet } from '../../class';
import AddressInput from '../../components/AddressInput';
import presentAlert from '../../components/Alert';
import AmountInput from '../../components/AmountInput';
import { ArrowPicker } from '../../components/ArrowPicker';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';

import { useStorage } from '../../hooks/context/useStorage';

type LdkOpenChannelProps = RouteProp<
  {
    params: {
      isPrivateChannel: boolean;
      psbt: Psbt;
      fundingWalletID: string;
      ldkWalletID: string;
      remoteHostWithPubkey: string;
    };
  },
  'params'
>;

const LdkOpenChannel = (props: any) => {
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { colors }: { colors: any } = useTheme();
  const { navigate, setParams } = useNavigation();
  const {
    fundingWalletID,
    isPrivateChannel,
    ldkWalletID,
    psbt,
    remoteHostWithPubkey = '030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f@52.50.244.44:9735' /* Bitrefill */,
  } = useRoute<LdkOpenChannelProps>().params;
  const fundingWallet = wallets.find(w => w.getID() === fundingWalletID) as HDSegwitBech32Wallet;
  const ldkWallet = wallets.find(w => w.getID() === ldkWalletID) as LightningLdkWallet;
  const [unit, setUnit] = useState<DoichainUnit | string>(ldkWallet.getPreferredBalanceUnit());
  const [isLoading, setIsLoading] = useState(false);
  const psbtOpenChannelStartedTs = useRef<number>();
  const name = useRoute().name;
  const [fundingAmount, setFundingAmount] = useState<any>({ amount: null, amountSats: null });
  const [verified, setVerified] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  /**
   * Handles when user navigates back from transaction creation flow and has PSBT object
   */
  useEffect(() => {
    if (!psbt) return;
    (async () => {
      if (psbtOpenChannelStartedTs.current ? +new Date() - psbtOpenChannelStartedTs.current >= 5 * 60 * 1000 : false) {
        // its 10 min actually, but lets check 5 min just for any case
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: 'Channel opening expired. Please try again' });
      }

      setVerified(true);
    })();
  }, [psbt]);

  const finalizeOpenChannel = async () => {
    setIsLoading(true);
    if (await isBiometricUseCapableAndEnabled()) {
      if (!(await unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }
    if (psbtOpenChannelStartedTs.current ? +new Date() - psbtOpenChannelStartedTs.current >= 5 * 60 * 1000 : false) {
      // its 10 min actually, but lets check 5 min just for any case
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      return presentAlert({ message: 'Channel opening expired. Please try again' });
    }

    const tx = psbt.extractTransaction();
    const res = await ldkWallet.fundingStateStepFinalize(tx.toHex()); // comment this out to debug
    // const res = true; // debug
    if (!res) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      return presentAlert({ message: 'Something wend wrong during opening channel tx broadcast' });
    }
    fetchAndSaveWalletTransactions(ldkWallet.getID());
    await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
    fetchAndSaveWalletTransactions(fundingWalletID);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    // @ts-ignore: Address types later
    navigate('Success', { amount: undefined });
    setIsLoading(false);
  };

  const openChannel = async () => {
    setIsLoading(true);
    try {
      const amountSatsNumber = new BigNumber(fundingAmount.amountSats).toNumber();
      if (!amountSatsNumber) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: 'Amount is not valid' });
      }

      const pubkey = remoteHostWithPubkey.split('@')[0];
      const host = remoteHostWithPubkey.split('@')[1];
      if (!pubkey || !host) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: 'Remote node address is not valid' });
      }

      const fundingAddressTemp = await ldkWallet.openChannel(pubkey, host, fundingAmount.amountSats, isPrivateChannel);
      console.warn('initiated channel opening');

      if (!fundingAddressTemp) {
        let reason = '';
        const channelsClosed = ldkWallet.getChannelsClosedEvents();
        const event = channelsClosed.pop();
        if (event) {
          reason += event.reason + ' ' + event.text;
        }
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: 'Initiating channel open failed: ' + reason });
      }

      psbtOpenChannelStartedTs.current = +new Date();
      // @ts-ignore: Address types later
      navigate('SendDetailsRoot', {
        screen: 'SendDetails',
        params: {
          memo: 'open channel',
          address: fundingAddressTemp,
          walletID: fundingWalletID,
          amount: fundingAmount.amount,
          amountSats: fundingAmount.amountSats,
          unit,
          noRbf: true,
          launchedBy: name,
          isEditable: false,
        },
      });
    } catch (error: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const onBarScanned = (ret: { data?: any }) => {
    if (!ret.data) ret = { data: ret };
    // @ts-ignore: Address types later
    setParams({ remoteHostWithPubkey: ret.data });
  };

  const render = () => {
    if (isLoading || !ldkWallet || !fundingWallet) {
      return (
        <View style={[styles.root, styles.justifyContentCenter, stylesHook.root]}>
          <BlueLoading style={{}} />
        </View>
      );
    }

    if (verified) {
      return (
        <View style={[styles.activeRoot, stylesHook.root]}>
          <BlueText>
            {loc.formatString(loc.lnd.opening_channnel_for_from, {
              forWalletLabel: ldkWallet.getLabel(),
              fromWalletLabel: fundingWallet.getLabel(),
            })}
          </BlueText>

          <BlueText>{loc.lnd.are_you_sure_open_channel}</BlueText>
          <BlueSpacing20 />
          <View style={styles.horizontalButtons}>
            <Button onPress={finalizeOpenChannel} title={loc._.continue} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.activeRoot, stylesHook.root]}>
        <BlueText>
          {loc.formatString(loc.lnd.opening_channnel_for_from, {
            forWalletLabel: ldkWallet.getLabel(),
            fromWalletLabel: fundingWallet.getLabel(),
          })}
        </BlueText>
        <AmountInput
          placeholder={loc.lnd.funding_amount_placeholder}
          isLoading={isLoading}
          amount={fundingAmount.amount}
          onAmountUnitChange={(newUnit: string) => {
            let amountSats = fundingAmount.amountSats;
            switch (newUnit) {
              case DoichainUnit.SWARTZ:
                amountSats = parseInt(fundingAmount.amount, 10);
                break;
              case DoichainUnit.DOI:
                amountSats = btcToSatoshi(fundingAmount.amount);
                break;
              case DoichainUnit.LOCAL_CURRENCY:
                // also accounting for cached fiat->sat conversion to avoid rounding error
                amountSats = btcToSatoshi(fiatToBTC(fundingAmount.amount));
                break;
            }
            setFundingAmount({ amount: fundingAmount.amount, amountSats });
            setUnit(newUnit);
          }}
          onChangeText={(text: string) => {
            let amountSats = fundingAmount.amountSats;
            switch (unit) {
              case DoichainUnit.DOI:
                amountSats = btcToSatoshi(text);
                break;
              case DoichainUnit.LOCAL_CURRENCY:
                amountSats = btcToSatoshi(fiatToBTC(Number(text)));
                break;
              case DoichainUnit.SWARTZ:
                amountSats = parseInt(text, 10);
                break;
            }
            setFundingAmount({ amount: text, amountSats });
          }}
          unit={unit}
          inputAccessoryViewID={(BlueDismissKeyboardInputAccessory as any).InputAccessoryViewID}
        />

        <AddressInput
          placeholder={loc.lnd.remote_host}
          address={remoteHostWithPubkey}
          isLoading={isLoading}
          inputAccessoryViewID={(BlueDismissKeyboardInputAccessory as any).InputAccessoryViewID}
          onChangeText={text =>
            // @ts-ignore: Address types later
            setParams({ remoteHostWithPubkey: text })
          }
          onBarScanned={onBarScanned}
          launchedBy={name}
        />
        <BlueDismissKeyboardInputAccessory />

        <ArrowPicker
          onChange={newKey => {
            const nodes = LightningLdkWallet.getPredefinedNodes();
            if (nodes[newKey])
              // @ts-ignore: Address types later
              setParams({ remoteHostWithPubkey: nodes[newKey] });
          }}
          items={LightningLdkWallet.getPredefinedNodes()}
          isItemUnknown={!Object.values(LightningLdkWallet.getPredefinedNodes()).some(node => node === remoteHostWithPubkey)}
        />
        <BlueSpacing20 />
        <View style={styles.horizontalButtons}>
          <Button onPress={openChannel} disabled={remoteHostWithPubkey.length === 0} title={loc.lnd.open_channel} />
        </View>
      </View>
    );
  };

  return <SafeArea style={[styles.root, stylesHook.root]}>{render()}</SafeArea>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  horizontalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
});

export default LdkOpenChannel;
