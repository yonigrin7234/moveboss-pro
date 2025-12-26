import ActivityKit
import SwiftUI
import ExpoModulesCore

// MARK: - Exceptions

final class ActivityUnavailableException: GenericException<Void> {
    override var reason: String {
        "Live Activities are not available on this device."
    }
}

final class ActivityFailedToStartException: GenericException<String> {
    override var reason: String {
        "Live Activity couldn't be started: \(param)"
    }
}

final class ActivityNotStartedException: GenericException<Void> {
    override var reason: String {
        "No Live Activity is currently running."
    }
}

final class ActivityAlreadyRunningException: GenericException<Void> {
    override var reason: String {
        "A Live Activity is already running. Stop it first."
    }
}

final class ActivityDataException: GenericException<String> {
    override var reason: String {
        "Invalid data passed to Live Activity: \(param)"
    }
}

// MARK: - Types

struct StartActivityArgs: Codable {
    struct Attributes: Codable {
        let tripId: String
        let tripName: String
        let loadNumber: String
        let pickupLocation: String
        let deliveryLocation: String
        let totalLoads: Int
        let currentLoadIndex: Int
    }

    struct ContentState: Codable {
        let currentStatus: String
        let statusLabel: String
        let progress: Double
        let eta: String?
        let distance: String?
    }

    let attributes: Attributes
    let contentState: ContentState

    static func fromJSON(rawData: String) -> Self? {
        let decoder = JSONDecoder()
        return try? decoder.decode(self, from: Data(rawData.utf8))
    }
}

struct UpdateActivityArgs: Codable {
    struct ContentState: Codable {
        let currentStatus: String
        let statusLabel: String
        let progress: Double
        let eta: String?
        let distance: String?
    }

    let contentState: ContentState

    static func fromJSON(rawData: String) -> Self? {
        let decoder = JSONDecoder()
        return try? decoder.decode(self, from: Data(rawData.utf8))
    }
}

struct StartActivityReturnType: Record {
    @Field
    var activityId: String
}

// MARK: - Helper Functions

func getCurrentActivity() -> Activity<TripActivityAttributes>? {
    guard #available(iOS 16.2, *) else {
        return nil
    }
    return Activity<TripActivityAttributes>.activities.first
}

func isActivityRunning() -> Bool {
    return getCurrentActivity() != nil
}

// MARK: - Module Definition

public class ActivityControllerModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ActivityController")

        // Property to check if Live Activities are enabled
        Property("areLiveActivitiesEnabled") {
            guard #available(iOS 16.2, *) else {
                return false
            }
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }

        // Start a new Live Activity
        AsyncFunction("startLiveActivity") { (rawData: String, promise: Promise) in
            guard #available(iOS 16.2, *) else {
                throw ActivityUnavailableException(())
            }

            guard let args = StartActivityArgs.fromJSON(rawData: rawData) else {
                throw ActivityDataException(rawData)
            }

            guard !isActivityRunning() else {
                throw ActivityAlreadyRunningException(())
            }

            let info = ActivityAuthorizationInfo()
            guard info.areActivitiesEnabled else {
                throw ActivityUnavailableException(())
            }

            do {
                let activityAttrs = TripActivityAttributes(
                    tripId: args.attributes.tripId,
                    tripName: args.attributes.tripName,
                    loadNumber: args.attributes.loadNumber,
                    pickupLocation: args.attributes.pickupLocation,
                    deliveryLocation: args.attributes.deliveryLocation,
                    totalLoads: args.attributes.totalLoads,
                    currentLoadIndex: args.attributes.currentLoadIndex
                )

                let activityState = TripActivityAttributes.TripState(
                    currentStatus: args.contentState.currentStatus,
                    statusLabel: args.contentState.statusLabel,
                    progress: args.contentState.progress,
                    eta: args.contentState.eta,
                    distance: args.contentState.distance
                )

                let activity = try Activity.request(
                    attributes: activityAttrs,
                    content: .init(state: activityState, staleDate: nil),
                    pushType: nil
                )

                log.debug("Started Live Activity: \(activity.id)")
                return StartActivityReturnType(activityId: Field(wrappedValue: activity.id))

            } catch let error {
                log.error("Failed to start Live Activity: \(error.localizedDescription)")
                throw ActivityFailedToStartException(error.localizedDescription)
            }
        }

        // Update the current Live Activity
        AsyncFunction("updateLiveActivity") { (rawData: String, promise: Promise) in
            guard #available(iOS 16.2, *) else {
                throw ActivityUnavailableException(())
            }

            guard let args = UpdateActivityArgs.fromJSON(rawData: rawData) else {
                throw ActivityDataException(rawData)
            }

            guard let activity = getCurrentActivity() else {
                throw ActivityNotStartedException(())
            }

            let newState = TripActivityAttributes.TripState(
                currentStatus: args.contentState.currentStatus,
                statusLabel: args.contentState.statusLabel,
                progress: args.contentState.progress,
                eta: args.contentState.eta,
                distance: args.contentState.distance
            )

            Task {
                await activity.update(
                    ActivityContent(state: newState, staleDate: nil)
                )
                log.debug("Updated Live Activity: \(activity.id)")
                promise.resolve()
            }
        }

        // Stop the current Live Activity
        AsyncFunction("stopLiveActivity") { (promise: Promise) in
            guard #available(iOS 16.2, *) else {
                throw ActivityUnavailableException(())
            }

            guard let activity = getCurrentActivity() else {
                throw ActivityNotStartedException(())
            }

            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
                log.debug("Stopped Live Activity: \(activity.id)")
                promise.resolve()
            }
        }

        // Check if an activity is running
        Function("isLiveActivityRunning") { () -> Bool in
            return isActivityRunning()
        }
    }
}
