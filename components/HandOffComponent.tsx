import React from 'react';

interface HandOffComponentProps {
  url?: string;
  title?: string;
  type: (typeof HandOffComponent.activityTypes)[keyof typeof HandOffComponent.activityTypes];
  userInfo?: object;
}

interface HandOffComponentWithActivityTypes extends React.FC<HandOffComponentProps> {
  activityTypes: {
    ReceiveOnchain: string;
    Xpub: string;
    ViewInBlockExplorer: string;
  };
}

const HandOffComponent: HandOffComponentWithActivityTypes = props => {
  return null;
};

const activityTypes = {
  ReceiveOnchain: 'org.doichain.doiwallet.receiveonchain',
  Xpub: 'org.doichain.doiwallet.xpub',
  ViewInBlockExplorer: 'org.doichain.doiwallet.blockexplorer',
};

HandOffComponent.activityTypes = activityTypes;

export default HandOffComponent;
