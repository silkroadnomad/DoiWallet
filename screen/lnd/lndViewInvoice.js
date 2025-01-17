import React, { useEffect, useRef, useState } from 'react';
import { useNavigationState, useRoute } from '@react-navigation/native';
import { BackHandler, I18nManager, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueLoading, BlueSpacing20, BlueText, BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DoichainUnit } from "../../models/doichainUnits";
import { SuccessView } from '../send/success';
import LNDCreateInvoice from './lndCreateInvoice';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

const LNDViewInvoice = () => {
  const { invoice, walletID } = useRoute().params;
  const { wallets, setSelectedWalletID, fetchAndSaveWalletTransactions } = useStorage();
  const wallet = wallets.find(w => w.getID() === walletID);
  const { colors, closeImage } = useTheme();
  const { goBack, navigate, setParams, setOptions, getParent } = useExtendedNavigation();
  const [isLoading, setIsLoading] = useState(typeof invoice === 'string');
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(true);
  const [invoiceStatusChanged, setInvoiceStatusChanged] = useState(false);
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const fetchInvoiceInterval = useRef();
  const isModal = useNavigationState(state => state.routeNames[0] === LNDCreateInvoice.routeName);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    detailsText: {
      color: colors.alternativeTextColor,
    },
    expired: {
      backgroundColor: colors.success,
    },
    additionalInfo: {
      backgroundColor: colors.brandingColor,
    },
  });

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions(
      isModal
        ? {
            headerStyle: {
              backgroundColor: colors.customHeader,
            },
            gestureEnabled: false,
            headerBackVisible: false,

            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.button}
                onPress={() => {
                  getParent().pop();
                }}
                testID="NavigationCloseButton"
              >
                <Image source={closeImage} />
              </TouchableOpacity>
            ),
          }
        : {
            headerRight: () => {},
            headerStyle: {
              backgroundColor: colors.customHeader,
            },
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, isModal]);

  useEffect(() => {
    setSelectedWalletID(walletID);
    console.log('LNDViewInvoice - useEffect');
    if (!invoice.ispaid) {
      fetchInvoiceInterval.current = setInterval(async () => {
        if (isFetchingInvoices) {
          try {
            const userInvoices = await wallet.getUserInvoices(20);
            // fetching only last 20 invoices
            // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
            // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
            const updatedUserInvoice = userInvoices.filter(filteredInvoice =>
              typeof invoice === 'object'
                ? filteredInvoice.payment_request === invoice.payment_request
                : filteredInvoice.payment_request === invoice,
            )[0];
            if (typeof updatedUserInvoice !== 'undefined') {
              setInvoiceStatusChanged(true);
              setParams({ invoice: updatedUserInvoice });
              setIsLoading(false);
              if (updatedUserInvoice.ispaid) {
                // we fetched the invoice, and it is paid :-)
                setIsFetchingInvoices(false);
                fetchAndSaveWalletTransactions(walletID);
              } else {
                const currentDate = new Date();
                const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
                const invoiceExpiration = updatedUserInvoice.timestamp + updatedUserInvoice.expire_time;
                if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                  // invoice expired :-(
                  fetchAndSaveWalletTransactions(walletID);
                  setIsFetchingInvoices(false);
                  triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                  clearInterval(fetchInvoiceInterval.current);
                  fetchInvoiceInterval.current = undefined;
                }
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      }, 3000);
    } else {
      setIsFetchingInvoices(false);
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  const navigateToPreImageScreen = () => {
    navigate('LNDViewAdditionalInvoicePreImage', {
      preImageData: invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? invoice.payment_preimage : 'none',
    });
  };

  const handleOnSharePressed = () => {
    Share.open({ message: `lightning:${invoice.payment_request}` }).catch(error => console.log(error));
  };

  const handleOnViewAdditionalInformationPressed = () => {
    navigate('LNDViewAdditionalInvoiceInformation', { walletID });
  };

  useEffect(() => {
    if (invoice.ispaid && invoiceStatusChanged) {
      setInvoiceStatusChanged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  useEffect(() => {
    if (invoiceStatusChanged) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [invoiceStatusChanged]);

  const onLayout = e => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  const render = () => {
    if (isLoading) {
      return (
        <View style={[styles.root, stylesHook.root]}>
          <BlueLoading />
        </View>
      );
    }

    if (typeof invoice === 'object') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
      const invoiceExpiration = invoice.timestamp + invoice.expire_time;
      if (invoice.ispaid || invoice.type === 'paid_invoice') {
        let amount = 0;
        if (invoice.type === 'paid_invoice' && invoice.value) {
          amount = invoice.value;
        } else if (invoice.type === 'user_invoice' && invoice.amt) {
          amount = invoice.amt;
        }
        let description = invoice.description;
        if (invoice.memo && invoice.memo.length > 0) {
          description = invoice.memo;
        }
        return (
          <View style={styles.root}>
            <SuccessView
              amount={amount}
              amountUnit={DoichainUnit.SWARTZ}
              invoiceDescription={description}
              shouldAnimate={invoiceStatusChanged}
            />
            <View style={styles.detailsRoot}>
              {invoice.payment_preimage &&
              typeof invoice.payment_preimage === "string" ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.detailsTouch}
                  onPress={navigateToPreImageScreen}
                >
                  <Text style={[styles.detailsText, stylesHook.detailsText]}>
                    {loc.send.create_details}
                  </Text>
                  <Icon
                    name={I18nManager.isRTL ? "angle-left" : "angle-right"}
                    size={18}
                    type="font-awesome"
                    color={colors.alternativeTextColor}
                  />
                </TouchableOpacity>
              ) : undefined}
            </View>
          </View>
        );
      }
      if (invoiceExpiration < now) {
        return (
          <View style={[styles.root, stylesHook.root, styles.justifyContentCenter]}>
            <View style={[styles.expired, stylesHook.expired]}>
              <Icon name="times" size={50} type="font-awesome" color={colors.successCheck} />
            </View>
            <BlueTextCentered>{loc.lndViewInvoice.wasnt_paid_and_expired}</BlueTextCentered>
          </View>
        );
      }
      // Invoice has not expired, nor has it been paid for.
      return (
        <ScrollView>
          <View style={[styles.activeRoot, stylesHook.root]}>
            <View style={styles.activeQrcode}>
              <QRCodeComponent value={invoice.payment_request} size={qrCodeSize} />
            </View>
            <BlueSpacing20 />
            <BlueText>
              {loc.lndViewInvoice.please_pay} {invoice.amt} {loc.lndViewInvoice.sats}
            </BlueText>
            {'description' in invoice && invoice.description.length > 0 && (
              <BlueText>
                {loc.lndViewInvoice.for} {invoice.description}
              </BlueText>
            )}
            <CopyTextToClipboard truncated text={invoice.payment_request} />

            <Button onPress={handleOnSharePressed} title={loc.receive.details_share} />

            <BlueSpacing20 />
            <Button
              style={stylesHook.additionalInfo}
              onPress={handleOnViewAdditionalInformationPressed}
              title={loc.lndViewInvoice.additional_info}
            />
          </View>
        </ScrollView>
      );
    }
  };

  return <SafeArea onLayout={onLayout}>{render()}</SafeArea>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  detailsRoot: {
    justifyContent: 'flex-end',
    marginBottom: 24,
    alignItems: 'center',
  },
  detailsTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    marginRight: 8,
  },
  expired: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeQrcode: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
});

export default LNDViewInvoice;
