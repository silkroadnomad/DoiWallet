import Foundation

class Balance {
    static func formatBalance(_ balance: Decimal, toUnit: DoichainUnit, withFormatting: Bool = false, completion: @escaping (String) -> Void) {
        switch toUnit {
        case .DOI:
            let value = balance / Decimal(100_000_000)
            completion("\(value) DOI") // Localize unit names as needed.
        case .SWARTZ:
            if withFormatting {
                completion(NumberFormatter.localizedString(from: balance as NSNumber, number: .decimal) + " SWARTZ") 
            } else {
                completion("\(balance) SWARTZ")
            }
        case .LOCAL_CURRENCY:
            fetchLocalCurrencyEquivalent(satoshi: balance, completion: completion)
        }
    }

    private static func fetchLocalCurrencyEquivalent(satoshi: Decimal, completion: @escaping (String) -> Void) {
      
        let currency = Currency.getUserPreferredCurrency() // Ensure this method retrieves the correct currency code.
        MarketAPI.fetchPrice(currency: currency) { dataStore, error in
            DispatchQueue.main.async {
                guard let dataStore = dataStore, error == nil else {
                    completion("Error: \(error?.localizedDescription ?? "Unknown error")")
                    return
                }
                let rate = Decimal(string: dataStore.rate) ?? Decimal(0)
                let convertedAmount = (satoshi / Decimal(100_000_000)) * rate
                completion("\(convertedAmount) \(currency)")
            }
        }
    }
}
