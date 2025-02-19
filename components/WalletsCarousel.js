import PropTypes from 'prop-types';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  Animated,
  FlatList,
  I18nManager,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlueSpacing10 } from '../BlueComponents';
import { MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import { useTheme } from './themes';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from './Context/StorageProvider';

const nStyles = StyleSheet.create({
  container: {
    borderRadius: 10,
    minHeight: Platform.OS === 'ios' ? 164 : 181,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  addAWAllet: {
    fontWeight: '600',
    fontSize: 24,
    marginBottom: 4,
  },
  addLine: {
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '500',
  },
});

const NewWalletPanel = ({ onPress }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = useIsLargeScreen();
  const nStylesHooks = StyleSheet.create({
    container: isLargeScreen
      ? {
          paddingHorizontal: 24,
          marginVertical: 16,
        }
      : { paddingVertical: 16, paddingHorizontal: 24 },
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      testID="CreateAWallet"
      onPress={onPress}
      style={isLargeScreen ? {} : { width: itemWidth * 1.2 }}
    >
      <View
        style={[
          nStyles.container,
          nStylesHooks.container,
          { backgroundColor: WalletGradient.createWallet() },
          isLargeScreen ? {} : { width: itemWidth },
        ]}
      >
        <Text style={[nStyles.addAWAllet, { color: colors.foregroundColor }]}>{loc.wallets.list_create_a_wallet}</Text>
        <Text style={[nStyles.addLine, { color: colors.alternativeTextColor }]}>{loc.wallets.list_create_a_wallet_text}</Text>
        <View style={nStyles.button}>
          <Text style={[nStyles.buttonText, { color: colors.brandingColor }]}>{loc.wallets.list_create_a_button}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

NewWalletPanel.propTypes = {
  onPress: PropTypes.func.isRequired,
};

const iStyles = StyleSheet.create({
  root: { paddingRight: 20 },
  rootLargeDevice: { marginVertical: 20 },
  grad: {
    padding: 15,
    borderRadius: 12,
    minHeight: 164,
  },
  balanceContainer: {
    height: 40,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  br: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTx: {
    backgroundColor: 'transparent',
    fontSize: 13,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxTime: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    fontSize: 16,
  },
  shadowContainer: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 25 / 100,
        shadowRadius: 8,
        borderRadius: 12,
      },
      android: {
        elevation: 8,
        borderRadius: 12,
      },
    }),
  },
});

export const WalletCarouselItem = React.memo(({ item, _, onPress, handleLongPress, isSelectedWallet, customStyle, horizontal }) => {
  const scaleValue = new Animated.Value(1.0);
  const { colors } = useTheme();
  const { walletTransactionUpdateStatus } = useStorage();
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = useIsLargeScreen();
  const onPressedIn = () => {
    Animated.spring(scaleValue, { duration: 50, useNativeDriver: true, toValue: 0.9 }).start();
  };

  const onPressedOut = () => {
    Animated.spring(scaleValue, { duration: 50, useNativeDriver: true, toValue: 1.0 }).start();
  };

  const opacity = isSelectedWallet === false ? 0.5 : 1.0;
  let image;
  switch (item.type) {    
    // case LightningCustodianWallet.type:
    //   image = I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
    //   break;
    case MultisigHDWallet.type:
      image = I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      break;
    default:
      image = I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
  }

  const latestTransactionText =
    walletTransactionUpdateStatus === WalletTransactionsStatus.ALL || walletTransactionUpdateStatus === item.getID()
      ? loc.transactions.updating
      : item.getBalance() !== 0 && item.getLatestTransactionTime() === 0
        ? loc.wallets.pull_to_refresh
        : item.getTransactions().find(tx => tx.confirmations === 0)
          ? loc.transactions.pending
          : transactionTimeToReadable(item.getLatestTransactionTime());

  const balance = !item.hideBalance && formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true);
  return (
    <Animated.View
      style={[
        isLargeScreen || !horizontal ? [iStyles.rootLargeDevice, customStyle] : customStyle ?? { ...iStyles.root, width: itemWidth },
        { opacity, transform: [{ scale: scaleValue }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        testID={item.getLabel()}
        onPressIn={onPressedIn}
        onPressOut={onPressedOut}
        onLongPress={() => {
          handleLongPress();
        }}
        onPress={() => {
          onPressedOut();
          setTimeout(() => {
            onPress(item); // Replace 'onPress' with your navigation function
          }, 50);
        }}
      >
        <View style={[iStyles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
          <LinearGradient colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
            <Image source={image} style={iStyles.image} />
            <Text style={iStyles.br} />
            <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
              {item.getLabel()}
            </Text>
            <View style={iStyles.balanceContainer}>
              {item.hideBalance ? (
                <>
                  <BlueSpacing10 />
                  <BlurredBalanceView />
                </>
              ) : (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  key={balance} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                  style={[iStyles.balance, { color: colors.inverseForegroundColor }]}
                >
                  {`${balance} `}
                </Text>
              )}
            </View>
            <Text style={iStyles.br} />
            <Text numberOfLines={1} style={[iStyles.latestTx, { color: colors.inverseForegroundColor }]}>
              {loc.wallets.list_latest_transaction}
            </Text>

            <Text numberOfLines={1} style={[iStyles.latestTxTime, { color: colors.inverseForegroundColor }]}>
              {latestTransactionText}
            </Text>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
});

WalletCarouselItem.propTypes = {
  item: PropTypes.any,
  onPress: PropTypes.func.isRequired,
  handleLongPress: PropTypes.func,
  isSelectedWallet: PropTypes.bool,
};

const cStyles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  contentLargeScreen: {
    paddingHorizontal: 16,
  },
  separatorStyle: {
    width: 16,
    height: 20,
  },
});

const ListHeaderComponent = () => <View style={cStyles.separatorStyle} />;

const WalletsCarousel = forwardRef((props, ref) => {
  const { preferredFiatCurrency, language } = useSettings();
  const { horizontal, data, handleLongPress, onPress, selectedWallet, scrollEnabled } = props;
  const renderItem = useCallback(
    ({ item, index }) =>
      item ? (
        <WalletCarouselItem
          isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
          item={item}
          index={index}
          handleLongPress={handleLongPress}
          onPress={onPress}
          horizontal={horizontal}
        />
      ) : (
        <NewWalletPanel onPress={onPress} />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [horizontal, selectedWallet, preferredFiatCurrency, language],
  );
  const flatListRef = useRef();

  useImperativeHandle(ref, () => ({
    scrollToItem: ({ item }) => {
      setTimeout(() => {
        flatListRef?.current?.scrollToItem({ item, viewOffset: 16 });
      }, 300);
    },
    scrollToIndex: ({ index }) => {
      setTimeout(() => {
        flatListRef?.current?.scrollToIndex({ index, viewOffset: 16 });
      }, 300);
    },
  }));

  const onScrollToIndexFailed = error => {
    console.log('onScrollToIndexFailed');
    console.log(error);
    flatListRef.current.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
    setTimeout(() => {
      if (data.length !== 0 && flatListRef.current !== null) {
        flatListRef.current.scrollToIndex({ index: error.index, animated: true });
      }
    }, 100);
  };

  const { width } = useWindowDimensions();
  const sliderHeight = 195;
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  return horizontal ? (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      extraData={data}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={false}
      pagingEnabled
      disableIntervalMomentum={horizontal}
      snapToInterval={itemWidth} // Adjust to your content width
      decelerationRate="fast"
      contentContainerStyle={cStyles.content}
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={10}
      scrollEnabled={scrollEnabled}
      ListHeaderComponent={ListHeaderComponent}
      style={{ minHeight: sliderHeight + 12 }}
      onScrollToIndexFailed={onScrollToIndexFailed}
      {...props}
    />
  ) : (
    <View style={cStyles.contentLargeScreen}>
      {data.map((item, index) =>
        item ? (
          <WalletCarouselItem
            isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
            item={item}
            index={index}
            handleLongPress={handleLongPress}
            onPress={onPress}
            key={index}
          />
        ) : (
          <NewWalletPanel key={index} onPress={onPress} />
        ),
      )}
    </View>
  );
});

WalletsCarousel.propTypes = {
  horizontal: PropTypes.bool,
  selectedWallet: PropTypes.string,
  onPress: PropTypes.func.isRequired,
  handleLongPress: PropTypes.func.isRequired,
  data: PropTypes.array,
};

export default WalletsCarousel;
