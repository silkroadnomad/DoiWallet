import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import assert from 'assert';
import dayjs from 'dayjs';
import { InteractionManager, Keyboard, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import { Transaction, TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';

import { DoichainUnit, Chain } from "../../models/doichainUnits";
import { NameOp, NamecoinNameOp, DoichainNameOp, ScriptPubKey } from "../../models/nameOp";

import HandOffComponent from '../../components/HandOffComponent';
import HeaderRightButton from '../../components/HeaderRightButton';
import { useTheme } from '../../components/themes';
import ToolTipMenu from '../../components/TooltipMenu';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';

const actionKeys = {
  CopyToClipboard: 'copyToClipboard',
  GoToWallet: 'goToWallet',
};

const actionIcons = {
  Clipboard: {
    iconValue: 'doc.on.doc',
  },
  GoToWallet: {
    iconValue: 'wallet.pass',
  },
};

function onlyUnique(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
}

function arrDiff(a1: any[], a2: any[]) {
  const ret = [];
  for (const v of a2) {
    if (a1.indexOf(v) === -1) {
      ret.push(v);
    }
  }
  return ret;
}

const toolTipMenuActions = [
  {
    id: actionKeys.CopyToClipboard,
    text: loc.transactions.copy_link,
    icon: actionIcons.Clipboard,
  },
];

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'TransactionDetails'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'TransactionDetails'>;

const TransactionDetails = () => {
  const { setOptions, navigate } = useExtendedNavigation<NavigationProps>();
  const { hash, walletID } = useRoute<RouteProps>().params;
  const { saveToDisk, txMetadata, counterpartyMetadata, wallets, getTransactions } = useStorage();
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [nameOps, setNameOps] = useState<{ name: string; value: string; operation?: string }[]>([]);  
  const [isLoading, setIsLoading] = useState(true);
  const [tx, setTX] = useState<Transaction>();
  const [memo, setMemo] = useState<string>('');
  const [counterpartyLabel, setCounterpartyLabel] = useState<string>('');
  const [paymentCode, setPaymentCode] = useState<string>('');
  const [isCounterpartyLabelVisible, setIsCounterpartyLabelVisible] = useState<boolean>(false);
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    memoTextInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    greyButton: {
      backgroundColor: colors.lightButton,
    },
    Link: {
      color: colors.buttonTextColor,
    },
  });

  const handleOnSaveButtonTapped = useCallback(() => {
    Keyboard.dismiss();
    if (!tx) return;
    txMetadata[tx.hash] = { memo };
    if (counterpartyLabel && paymentCode) {
      counterpartyMetadata[paymentCode] = { label: counterpartyLabel };
    }
    saveToDisk().then(_success => {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentAlert({ message: loc.transactions.transaction_saved });
    });
  }, [tx, txMetadata, memo, counterpartyLabel, paymentCode, saveToDisk, counterpartyMetadata]);

  const HeaderRight = useMemo(
    () => <HeaderRightButton onPress={handleOnSaveButtonTapped} testID="SaveButton" disabled={false} title={loc.wallets.details_save} />,

    [handleOnSaveButtonTapped],
  );

  useEffect(() => {
    // This effect only handles changes in `colors`
    setOptions({ headerRight: () => HeaderRight });
  }, [colors, HeaderRight, setOptions]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        let foundTx: Transaction | false = false;
        let newFrom: string[] = [];
        let newTo: string[] = [];
        let newNameOps: NameOp[] = [];        
        for (const transaction of getTransactions(undefined, Infinity, true)) {
          if (transaction.hash === hash) {
            foundTx = transaction;
            for (const input of foundTx.inputs) {
              newFrom = newFrom.concat(input?.addresses ?? []);
            }
            for (const output of foundTx.outputs) {
              if (output?.scriptPubKey?.addresses) newTo = newTo.concat(output.scriptPubKey.addresses);
              
              if (output?.scriptPubKey?.nameOp) {
                const scriptPubKey = output.scriptPubKey;
                const nameOp = scriptPubKey.nameOp;
                const wallet = wallets.find(w => w.getID() === walletID);
                
                if (wallet?.chain === Chain.NMC && nameOp instanceof Map) {
                  // Handle Namecoin nameOp format
                  const name = nameOp.get('name')?.toString() || '';
                  const value = nameOp.get('value')?.toString() || '';
                  const op = nameOp.get('op')?.toString() || '';
                  
                  if (name && value && op) {
                    newNameOps.push({
                      name,
                      value,
                      operation: op
                    });
                  }
                } else if (Array.isArray(nameOp)) {
                  // Handle Doichain nameOp format
                  const doiOps = nameOp as DoichainNameOp[];
                  newNameOps.push(...doiOps.map(op => ({
                    name: op.name,
                    value: op.value
                  })));
                }
              }
            }
          }
        }

        assert(foundTx, 'Internal error: could not find transaction');

        const wallet = wallets.find(w => w.getID() === walletID);
        assert(wallet, 'Internal error: could not find wallet');

        if (wallet.allowBIP47() && wallet.isBIP47Enabled() && 'getBip47CounterpartyByTxid' in wallet) {
          const foundPaymentCode = wallet.getBip47CounterpartyByTxid(hash);
          if (foundPaymentCode) {
            // okay, this txid _was_ with someone using payment codes, so we show the label edit dialog
            // and load user-defined alias for the pc if any

            setCounterpartyLabel(counterpartyMetadata ? counterpartyMetadata[foundPaymentCode]?.label ?? '' : '');
            setIsCounterpartyLabelVisible(true);
            setPaymentCode(foundPaymentCode);
          }
        }

        setMemo(txMetadata[foundTx.hash]?.memo ?? '');
        setTX(foundTx);
        setFrom(newFrom);
        setTo(newTo);
        //setNameOps(newNameOps.map(name => ({ name, value: '' }))); 
        setNameOps(newNameOps); 
        setIsLoading(false);
      });
      return () => {
        task.cancel();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hash, wallets]),
  );

  const handleOnOpenTransactionOnBlockExplorerTapped = () => {

    let url = `https://explorer.doichain.org`;
    if (tx) url += `/tx/?txid=${tx.hash}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url).catch(e => {
            console.log('openURL failed in handleOnOpenTransactionOnBlockExplorerTapped');
            console.log(e.message);
            triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
            presentAlert({ message: e.message });
          });
        } else {
          console.log('canOpenURL supported is false in handleOnOpenTransactionOnBlockExplorerTapped');
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          presentAlert({ message: loc.transactions.open_url_error });
        }
      })
      .catch(e => {
        console.log('canOpenURL failed in handleOnOpenTransactionOnBlockExplorerTapped');
        console.log(e.message);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: e.message });
      });
  };

  const handleCopyPress = (stringToCopy: string) => {
    Clipboard.setString(stringToCopy !== actionKeys.CopyToClipboard ? stringToCopy : `https://mempool.space/tx/${tx?.hash}`);
  };

  if (isLoading || !tx) {
    return <BlueLoading />;
  }

  const weOwnAddress = (address: string): TWallet | null => {
    for (const w of wallets) {
      if (w.weOwnAddress(address)) {
        return w;
      }
    }
    return null;
  };

  const navigateToWallet = (wallet: TWallet) => {
    navigate('WalletTransactions', {
      walletID: wallet.getID(),
      walletType: wallet.type,
    });
  };

  const onPressMenuItem = (key: string) => {
    if (key === actionKeys.CopyToClipboard) {
      handleCopyPress(key);
    } else if (key === actionKeys.GoToWallet) {
      const wallet = weOwnAddress(key);
      if (wallet) {
        navigateToWallet(wallet);
      }
    }
  };

  const renderSection = (array: any[]) => {
    const fromArray = [];

    for (const [index, address] of array.entries()) {
      const actions = [];
      actions.push({
        id: actionKeys.CopyToClipboard,
        text: loc.transactions.details_copy,
        icon: actionIcons.Clipboard,
      });
      const isWeOwnAddress = weOwnAddress(address);
      if (isWeOwnAddress) {
        actions.push({
          id: actionKeys.GoToWallet,
          text: loc.formatString(loc.transactions.view_wallet, { walletLabel: isWeOwnAddress.getLabel() }),
          icon: actionIcons.GoToWallet,
        });
      }

      fromArray.push(
        <ToolTipMenu key={index} isButton title={address} isMenuPrimaryAction actions={actions} onPressMenuItem={onPressMenuItem}>
          <BlueText style={isWeOwnAddress ? [styles.rowValue, styles.weOwnAddress] : styles.rowValue}>
            {address}
            {index === array.length - 1 ? null : ','}
          </BlueText>
        </ToolTipMenu>,
      );
    }

    return fromArray;
  };

  return (
    <ScrollView style={styles.scroll} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <HandOffComponent
        title={loc.transactions.details_title}
        type={HandOffActivityType.ViewInBlockExplorer}
        url={`https://mempool.space/tx/${tx.hash}`}
      />
      <BlueCard>
        <View>
          <TextInput
            placeholder={loc.send.details_note_placeholder}
            value={memo}
            placeholderTextColor="#81868e"
            clearButtonMode="while-editing"
            style={[styles.memoTextInput, stylesHooks.memoTextInput]}
            onChangeText={setMemo}
            testID="TransactionDetailsMemoInput"
          />
          {isCounterpartyLabelVisible ? (
            <View>
              <BlueSpacing20 />
              <TextInput
                placeholder={loc.send.counterparty_label_placeholder}
                value={counterpartyLabel}
                placeholderTextColor="#81868e"
                style={[styles.memoTextInput, stylesHooks.memoTextInput]}
                onChangeText={setCounterpartyLabel}
              />
              <BlueSpacing20 />
            </View>
          ) : null}
        </View>

        {from && (
          <>
            <View style={styles.rowHeader}>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_from}</BlueText>
              <CopyToClipboardButton stringToCopy={from.filter(onlyUnique).join(', ')} />
            </View>
            {renderSection(from.filter(onlyUnique))}
            <View style={styles.marginBottom18} />
          </>
        )}

        {to && (
          <>
            <View style={styles.rowHeader}>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_to}</BlueText>
              <CopyToClipboardButton stringToCopy={to.join(', ')} />
            </View>
            {renderSection( to)}
            <View style={styles.marginBottom18} />
          </>
        )}


        {tx.hash && (
          <>
            <View style={styles.rowHeader}>
              <BlueText style={styles.txid}>{loc.transactions.txid}</BlueText>
              <CopyToClipboardButton stringToCopy={tx.hash} />
            </View>
            <BlueText style={styles.rowValue}>{tx.hash}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.received && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_received}</BlueText>
            <BlueText style={styles.rowValue}>{dayjs(tx.received).format('LLL')}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.inputs && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_inputs}</BlueText>
            <BlueText style={styles.rowValue}>{tx.inputs.length}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.outputs?.length > 0 && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_outputs}</BlueText>
            <BlueText style={styles.rowValue}>{tx.outputs.length}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {nameOps.length > 0 && (
          <>            
            {nameOps.map((nameOp: { name: string; value: string; operation?: string }, index: number) => (
              <React.Fragment key={index}>
                {nameOp.operation && (
                  <BlueText style={styles.rowCaption}>{loc.transactions.nameOps_operation}: {nameOp.operation}</BlueText>
                )}
                <BlueText style={styles.rowCaption}>{loc.transactions.nameOps_name}: {nameOp.name}</BlueText>
                <BlueText style={styles.rowCaption}>{loc.transactions.nameOps_value}: {nameOp.value}</BlueText>
                <BlueText style={styles.rowValue}> </BlueText>
              </React.Fragment>
            ))}
            <View style={styles.marginBottom18} />
          </>
        )}

        <ToolTipMenu
          isButton
          actions={toolTipMenuActions}
          onPressMenuItem={handleCopyPress}
          onPress={handleOnOpenTransactionOnBlockExplorerTapped}
          buttonStyle={StyleSheet.flatten([styles.greyButton, stylesHooks.greyButton])}
        >
          <Text style={[styles.Link, stylesHooks.Link]}>{loc.transactions.details_show_in_block_explorer}</Text>
        </ToolTipMenu>
      </BlueCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  rowHeader: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  rowCaption: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowValue: {
    color: 'grey',
  },
  marginBottom18: {
    marginBottom: 18,
  },
  txid: {
    fontSize: 16,
    fontWeight: '500',
  },
  Link: {
    fontWeight: '600',
    fontSize: 15,
  },
  weOwnAddress: {
    fontWeight: '700',
  },
  memoTextInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
  greyButton: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 4,
  },
});

export default TransactionDetails;
