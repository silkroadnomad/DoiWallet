//
//  Currency.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct CurrencyError: LocalizedError {
  var errorDescription: String = "Failed to parse response"
}

class Currency {
  
  static func getUserPreferredCurrency() -> String {
    
    if let userDefaults2 = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue) {
        // Zeigt nur die Existenz des Objekts
        print("__________UserDefaults Object: \(userDefaults2)") // <NSUserDefaults: Speicheradresse>
        
        // Zeigt den gesamten Inhalt des Objekts
        print("Complete UserDefaults Content: \(userDefaults2.dictionaryRepresentation())")
    }
    
    if let userDefaults2 = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue) {
        // Zeigt nur die Existenz des Objekts
      print("_______AppleLocale \(userDefaults2.string(forKey:"AppleLocale") )")
        
        // Zeigt den gesamten Inhalt des Objekts
        print("Complete UserDefaults Content: \(userDefaults2.dictionaryRepresentation())")
    }
    
    

    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
          let preferredCurrency = userDefaults.string(forKey: "preferredCurrency")
    else {
     
      return "USD"
    }

    if preferredCurrency != Currency.getLastSelectedCurrency() {
      UserDefaults.standard.removeObject(forKey: WidgetData.WidgetCachedDataStoreKey)
      UserDefaults.standard.removeObject(forKey: WidgetData.WidgetDataStoreKey)
      UserDefaults.standard.synchronize()
    }

    return preferredCurrency
  }

  static func getUserPreferredCurrencyLocale() -> String {
    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
          let preferredCurrency = userDefaults.string(forKey: "preferredCurrencyLocale")
    else {
      return "en_US"
    }
    return preferredCurrency
  }

  static func getLastSelectedCurrency() -> String {
    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue), let dataStore = userDefaults.string(forKey: "currency") else {
      return "USD"
    }

    return dataStore
  }

  static func saveNewSelectedCurrency() {
    UserDefaults.standard.setValue(Currency.getUserPreferredCurrency(), forKey: "currency")
  }

  
}

