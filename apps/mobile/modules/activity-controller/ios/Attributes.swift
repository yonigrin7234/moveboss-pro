import ActivityKit
import SwiftUI

/// Defines the data structure for the MoveBoss Trip Live Activity
public struct TripActivityAttributes: ActivityAttributes {
    /// Dynamic content that can be updated while the activity is running
    public struct ContentState: Codable & Hashable {
        /// Current status: "loading", "in_transit", "arrived", "delivered"
        public let currentStatus: String
        /// Human-readable status label
        public let statusLabel: String
        /// Progress percentage (0.0 - 1.0)
        public let progress: Double
        /// Estimated time remaining (e.g., "45 min")
        public let eta: String?
        /// Distance remaining (e.g., "32 mi")
        public let distance: String?
    }

    public typealias TripState = ContentState

    /// Static content that doesn't change during the activity
    /// Trip identifier
    public let tripId: String
    /// Trip name/number
    public let tripName: String
    /// Current load number
    public let loadNumber: String
    /// Pickup location (city, state)
    public let pickupLocation: String
    /// Delivery location (city, state)
    public let deliveryLocation: String
    /// Total number of loads
    public let totalLoads: Int
    /// Current load index (1-based)
    public let currentLoadIndex: Int
}
