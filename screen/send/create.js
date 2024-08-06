import Clipboard from '@react-native-clipboard/clipboard';

import { DoichainUnit } from '../../models/doichainUnits';
import { useNavigation, useRoute } from '@react-navigation/native';
import BigNumber from "bignumber.js";
import * as bitcoin from "bitcoinjs-lib";
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useState } from 'react';
import {  Alert,  FlatList,  Linking,  Platform,  StyleSheet,  Text,  TextInput,  TouchableOpacity,  View,} from "react-native";
import { Icon } from "@rneui/themed";
import RNFS from "react-native-fs";
import { PERMISSIONS, request, RESULTS } from "react-native-permissions";
import Share from "react-native-share";
import { SecondButton } from '../../components/SecondButton';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import Notifications from '../../blue_modules/notifications';
import { satoshiToBTC } from "../../blue_modules/currency";
import { isDesktop } from '../../blue_modules/environment';
import { BlueText } from "../../BlueComponents";
import presentAlert from "../../components/Alert";
import { DynamicQRCode } from "../../components/DynamicQRCode";
import { useTheme } from '../../components/themes';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from "../../hooks/useExtendedNavigation";

const SendCreate = () => {
  const { fee, recipients, wallet,  memo = "", satoshiPerByte, psbt, showAnimatedQr, tx,} = useRoute().params;

  const { txMetadata, fetchAndSaveWalletTransactions, isElectrumDisabled } =  useStorage();
  const route = useRoute();
  const transaction = bitcoin.Transaction.fromHex(tx);
  const size = transaction.virtualSize();
  const { colors } = useTheme();
  const { setOptions } = useNavigation();
  const { enableBlur, disableBlur } = usePrivacy(); 
  const navigation = useExtendedNavigation();
  
 // const [isLoading, setIsLoading] = useState(true);
  const { isBiometricUseCapableAndEnabled } = useBiometrics(); 
  const broadcast = async () => {
   // setIsLoading(true);
    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
       // setIsLoading(false);
        return;
      }
    }
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const result =1 // await wallet.broadcastTx(tx);
      if (result) {
      //  setIsLoading(false);
        const txDecoded = bitcoin.Transaction.fromHex(tx);
        const txid = txDecoded.getId();
        Notifications.majorTomToGroundControl([], [], [txid]);
        if (memo) {
          txMetadata[txid] = { memo };
        }
        navigation.navigate("Success", {
          amount: undefined,
          txid: txid,
          fee: fee,
        });
        await new Promise((resolve) => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        fetchAndSaveWalletTransactions(wallet.getID());
      } else {
        /*
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        */
        presentAlert({ message: loc.errors.broadcast });
      }
    } catch (error) {
      /*
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      */
      presentAlert({ message: error.message });
    }
  };


  const styleHooks = StyleSheet.create({
    transactionDetailsTitle: {
      color: colors.feeText,
    },
    transactionDetailsSubtitle: {
      color: colors.foregroundColor,
    },
    separator: {
      backgroundColor: colors.inputBorderColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    cardText: {
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    console.log("send/create - useEffect");
    enableBlur();
    return () => {
      disableBlur();
    };
  }, [disableBlur, enableBlur]);

  const exportTXN = useCallback(async () => {
    const fileName = `${Date.now()}.txn`;
    if (Platform.OS === "ios") {
      const filePath = RNFS.TemporaryDirectoryPath + `/${fileName}`;
      await RNFS.writeFile(filePath, tx);
      Share.open({
        url: "file://" + filePath,
        saveToFiles: isDesktop,
      })
        .catch((error) => {
          console.log(error);
        })
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === "android") {
      const granted = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      if (granted === RESULTS.GRANTED) {
        console.log("Storage Permission: Granted");
        const filePath = RNFS.DownloadDirectoryPath + `/${fileName}`;
        try {
          await RNFS.writeFile(filePath, tx);
          presentAlert({ message: loc.formatString(loc.send.txSaved, { filePath }), });
        } catch (e) {
          console.log(e);
          presentAlert({ message: e.message });
        }
      } else {
        console.log("Storage Permission: Denied");
        Alert.alert(
          loc.send.permission_storage_title,
          loc.send.permission_storage_denied_message,
          [
            {
              text: loc.send.open_settings,
              onPress: () => {
                Linking.openSettings();
              },
              style: "default",
            },
            { text: loc._.cancel, onPress: () => {}, style: "cancel" },
          ]
        );
      }
    }
  }, [tx]);

  useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity accessibilityRole="button" onPress={exportTXN}>
          <Icon size={22} name="share-alternative" type="entypo" color={colors.foregroundColor} />
        </TouchableOpacity>
      ),
    });
  }, [colors, exportTXN, setOptions]);

  const _renderItem = ({ index, item }) => {
    return (
      <>
        <View>
          <Text
            style={[
              styles.transactionDetailsTitle,
              styleHooks.transactionDetailsTitle,
            ]}
          >
            {loc.send.create_to}
          </Text>
          <Text
            style={[
              styles.transactionDetailsSubtitle,
              styleHooks.transactionDetailsSubtitle,
            ]}
          >
            {item.address}
          </Text>
          <Text
            style={[
              styles.transactionDetailsTitle,
              styleHooks.transactionDetailsTitle,
            ]}
          >
            {loc.send.create_amount}
          </Text>
          <Text
            style={[
              styles.transactionDetailsSubtitle,
              styleHooks.transactionDetailsSubtitle,
            ]}
          >
            {satoshiToBTC(item.value)} {DoichainUnit.DOI}
          </Text>
          {item.nameId !== undefined && (
            <Text
              style={[
                styles.transactionDetailsTitle,
                styleHooks.transactionDetailsTitle,
              ]}
            >
              {loc.send.name}
            </Text>
          )}
          {item.nameId !== undefined && (
            <Text
              style={[
                styles.transactionDetailsSubtitle,
                styleHooks.transactionDetailsSubtitle,
              ]}
            >
              {item.nameId}
            </Text>
          )}
          {item.nameValue !== undefined && (
            <Text
              style={[
                styles.transactionDetailsTitle,
                styleHooks.transactionDetailsTitle,
              ]}
            >              
              {loc.send.broadcast_value}
            </Text>
          )}
          {item.nameValue !== undefined && (
            <Text
              style={[
                styles.transactionDetailsSubtitle,
                styleHooks.transactionDetailsSubtitle,
              ]}
            >
              {item.nameValue}
            </Text>
          )}
          {recipients.length > 1 && (
            <BlueText style={styles.itemOf}>
              {loc.formatString(loc._.of, {
                number: index + 1,
                total: recipients.length,
              })}
            </BlueText>
          )}
        </View>
      </>
    );
  };
  _renderItem.propTypes = {
    index: PropTypes.number,
    item: PropTypes.shape({
      address: PropTypes.string,
      value: PropTypes.number,
      nameId: PropTypes.nameId,
      nameValue: PropTypes.nameValue,
    }),
  };

  const renderSeparator = () => {
    return <View style={[styles.separator, styleHooks.separator]} />;
  };

  const ListHeaderComponent = (
    <View>
      {showAnimatedQr && psbt ? <DynamicQRCode value={psbt.toHex()} /> : null}
      <BlueText style={[styles.cardText, styleHooks.cardText]}>
        {loc.send.create_this_is_hex}
      </BlueText>
      <TextInput
        testID="TxhexInput"
        style={styles.cardTx}
        height={72}
        multiline
        editable={false}
        value={tx}
      />

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.actionTouch}
        onPress={() => Clipboard.setString(tx)}
      >
        <Text style={styles.actionText}>{loc.send.create_copy}</Text>
      </TouchableOpacity>
     
      <SecondButton
        disabled={isElectrumDisabled}
        onPress={broadcast}
        title={loc.send.broadcast}
        testID="PsbtBroadcastTransactionButton"
      />
    </View>
  );

  const ListFooterComponent = (
    <View>
      <Text
        style={[
          styles.transactionDetailsTitle,
          styleHooks.transactionDetailsTitle,
        ]}
      >
        {loc.send.create_fee}
      </Text>
      <Text
        style={[
          styles.transactionDetailsSubtitle,
          styleHooks.transactionDetailsSubtitle,
        ]}
      >
        {new BigNumber(fee).toFixed()} {DoichainUnit.DOI}
      </Text>
      <Text
        style={[
          styles.transactionDetailsTitle,
          styleHooks.transactionDetailsTitle,
        ]}
      >
        {loc.send.create_tx_size}
      </Text>
      <Text
        style={[
          styles.transactionDetailsSubtitle,
          styleHooks.transactionDetailsSubtitle,
        ]}
      >
        {size} vbytes
      </Text>
      <Text
        style={[
          styles.transactionDetailsTitle,
          styleHooks.transactionDetailsTitle,
        ]}
      >
        {loc.send.create_satoshi_per_vbyte}
      </Text>
      <Text
        style={[
          styles.transactionDetailsSubtitle,
          styleHooks.transactionDetailsSubtitle,
        ]}
      >
        {satoshiPerByte} Swartz/vB
      </Text>
      {memo?.length > 0 && (
        <>
          <Text
            style={[
              styles.transactionDetailsTitle,
              styleHooks.transactionDetailsTitle,
            ]}
          >
            {loc.send.create_memo}
          </Text>
          <Text
            style={[
              styles.transactionDetailsSubtitle,
              styleHooks.transactionDetailsSubtitle,
            ]}
          >
            {memo}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      contentContainerStyle={[styles.root, styleHooks.root]}
      extraData={recipients}
      data={recipients}
      renderItem={_renderItem}
      keyExtractor={(_item, index) => `${index}`}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    />
  );
};

export default SendCreate;

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    fontWeight: "500",
    fontSize: 17,
    marginBottom: 2,
  },
  root: {
    paddingHorizontal: 20,
  },
  transactionDetailsSubtitle: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 20,
  },
  itemOf: {
    alignSelf: "flex-end",
  },
  separator: {
    height: 0.5,
    marginVertical: 16,
  },
  cardText: {
    fontWeight: "500",
  },
  cardTx: {
    borderColor: "#ebebeb",
    backgroundColor: "#d2f8d6",
    borderRadius: 4,
    marginTop: 20,
    color: "#37c0a1",
    fontWeight: "500",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  actionTouch: {
    marginVertical: 24,
  },
  actionButton: {
    marginBottom: 20,
    color: "#37c0a1",
    borderColor: "#ebebeb",
    fontSize: 17,
  },
  actionText: {
    color: "#9aa0aa",
    fontSize: 15,
    fontWeight: "500",
    alignSelf: "center",
  },
});
