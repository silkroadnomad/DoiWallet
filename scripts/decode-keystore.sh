#!/bin/sh

 echo $ENV_KEYSTORE_BASE64  | base64 --decode > /home/DoiWallet/android/app/upload-keystore.jks 