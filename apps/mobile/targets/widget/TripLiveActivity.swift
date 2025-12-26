import ActivityKit
import WidgetKit
import SwiftUI

/// MoveBoss Trip Live Activity Widget
/// Displays trip progress on Lock Screen and Dynamic Island
struct TripLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TripActivityAttributes.self) { context in
            // Lock Screen / Notification Banner View
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedLeadingView(context: context)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedTrailingView(context: context)
                }
                DynamicIslandExpandedRegion(.center) {
                    ExpandedCenterView(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(context: context)
                }
            } compactLeading: {
                // Compact left side
                CompactLeadingView(context: context)
            } compactTrailing: {
                // Compact right side
                CompactTrailingView(context: context)
            } minimal: {
                // Minimal (when another activity is present)
                MinimalView(context: context)
            }
        }
    }
}

// MARK: - Lock Screen View
struct LockScreenView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(spacing: 12) {
            // Header with trip info
            HStack {
                Image(systemName: "truck.box.fill")
                    .foregroundColor(.blue)
                    .font(.title2)

                VStack(alignment: .leading, spacing: 2) {
                    Text("MoveBoss")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(context.attributes.tripName)
                        .font(.headline)
                        .fontWeight(.bold)
                }

                Spacer()

                // Load counter
                VStack(alignment: .trailing) {
                    Text("Load \(context.attributes.currentLoadIndex)/\(context.attributes.totalLoads)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("#\(context.attributes.loadNumber)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            }

            // Progress bar
            VStack(spacing: 6) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Background
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 6)

                        // Progress
                        RoundedRectangle(cornerRadius: 4)
                            .fill(progressColor)
                            .frame(width: geometry.size.width * context.state.progress, height: 6)
                    }
                }
                .frame(height: 6)

                // Status row
                HStack {
                    statusIcon
                        .foregroundColor(progressColor)
                    Text(context.state.statusLabel)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Spacer()

                    if let eta = context.state.eta {
                        Text(eta)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if let distance = context.state.distance {
                        Text(distance)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Route info
            HStack(spacing: 8) {
                // Pickup
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                    Text(context.attributes.pickupLocation)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Image(systemName: "arrow.right")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                // Delivery
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text(context.attributes.deliveryLocation)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Spacer()
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }

    var statusIcon: Image {
        switch context.state.currentStatus {
        case "loading":
            return Image(systemName: "arrow.down.to.line.compact")
        case "in_transit":
            return Image(systemName: "truck.box.fill")
        case "arrived":
            return Image(systemName: "mappin.circle.fill")
        case "delivered":
            return Image(systemName: "checkmark.circle.fill")
        default:
            return Image(systemName: "clock.fill")
        }
    }

    var progressColor: Color {
        switch context.state.currentStatus {
        case "loading":
            return .orange
        case "in_transit":
            return .blue
        case "arrived":
            return .purple
        case "delivered":
            return .green
        default:
            return .gray
        }
    }
}

// MARK: - Dynamic Island Views

struct ExpandedLeadingView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("FROM")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
            Text(context.attributes.pickupLocation)
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(1)
        }
    }
}

struct ExpandedTrailingView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text("TO")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
            Text(context.attributes.deliveryLocation)
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(1)
        }
    }
}

struct ExpandedCenterView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(spacing: 4) {
            Text(context.state.statusLabel)
                .font(.system(size: 14, weight: .bold))

            if let eta = context.state.eta, let distance = context.state.distance {
                Text("\(distance) • \(eta)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ExpandedBottomView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(spacing: 8) {
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white)
                        .frame(width: geometry.size.width * context.state.progress, height: 4)
                }
            }
            .frame(height: 4)

            // Load info
            HStack {
                Image(systemName: "truck.box.fill")
                    .font(.system(size: 12))
                Text("Load #\(context.attributes.loadNumber)")
                    .font(.system(size: 12, weight: .medium))

                Spacer()

                Text("\(context.attributes.currentLoadIndex) of \(context.attributes.totalLoads)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct CompactLeadingView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        Image(systemName: statusIcon)
            .foregroundColor(statusColor)
            .font(.system(size: 14, weight: .semibold))
    }

    var statusIcon: String {
        switch context.state.currentStatus {
        case "loading":
            return "arrow.down.circle.fill"
        case "in_transit":
            return "truck.box.fill"
        case "arrived":
            return "mappin.circle.fill"
        case "delivered":
            return "checkmark.circle.fill"
        default:
            return "clock.fill"
        }
    }

    var statusColor: Color {
        switch context.state.currentStatus {
        case "loading":
            return .orange
        case "in_transit":
            return .blue
        case "arrived":
            return .purple
        case "delivered":
            return .green
        default:
            return .gray
        }
    }
}

struct CompactTrailingView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        if let eta = context.state.eta {
            Text(eta)
                .font(.system(size: 12, weight: .semibold))
                .monospacedDigit()
        } else {
            Text("\(Int(context.state.progress * 100))%")
                .font(.system(size: 12, weight: .semibold))
                .monospacedDigit()
        }
    }
}

struct MinimalView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        Image(systemName: "truck.box.fill")
            .foregroundColor(.blue)
            .font(.system(size: 12))
    }
}

// MARK: - Previews
#if DEBUG
#Preview("Lock Screen", as: .content, using: TripActivityAttributes(
    tripId: "trip-123",
    tripName: "Trip #1045",
    loadNumber: "LD-2024-001",
    pickupLocation: "Los Angeles, CA",
    deliveryLocation: "Phoenix, AZ",
    totalLoads: 3,
    currentLoadIndex: 2
)) {
    TripLiveActivity()
} contentStates: {
    TripActivityAttributes.TripState(
        currentStatus: "in_transit",
        statusLabel: "In Transit",
        progress: 0.65,
        eta: "45 min",
        distance: "32 mi"
    )
}

#Preview("Dynamic Island Expanded", as: .dynamicIsland(.expanded), using: TripActivityAttributes(
    tripId: "trip-123",
    tripName: "Trip #1045",
    loadNumber: "LD-2024-001",
    pickupLocation: "Los Angeles, CA",
    deliveryLocation: "Phoenix, AZ",
    totalLoads: 3,
    currentLoadIndex: 2
)) {
    TripLiveActivity()
} contentStates: {
    TripActivityAttributes.TripState(
        currentStatus: "in_transit",
        statusLabel: "In Transit",
        progress: 0.65,
        eta: "45 min",
        distance: "32 mi"
    )
}

#Preview("Dynamic Island Compact", as: .dynamicIsland(.compact), using: TripActivityAttributes(
    tripId: "trip-123",
    tripName: "Trip #1045",
    loadNumber: "LD-2024-001",
    pickupLocation: "Los Angeles, CA",
    deliveryLocation: "Phoenix, AZ",
    totalLoads: 3,
    currentLoadIndex: 2
)) {
    TripLiveActivity()
} contentStates: {
    TripActivityAttributes.TripState(
        currentStatus: "in_transit",
        statusLabel: "In Transit",
        progress: 0.65,
        eta: "45 min",
        distance: "32 mi"
    )
}
#endif
