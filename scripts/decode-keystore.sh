#!/bin/sh

 echo $ENV_KEYSTORE_BASE64  | base64 --decode > /home/DoiWallet/android/app/upload-keystore.jks

 echo $ENV_JSON_KEY_FILE  | base64 --decode > /home/DoiWallet/android/keystores/pc-api-7544041306212151668-842-081c5b393ff8.json 
  
 echo $ENV_RELEASE_KEYSTORE_PROPERTIES | base64 --decode > /home/DoiWallet/android/keystores/keystore_files/release.keystore.properties


