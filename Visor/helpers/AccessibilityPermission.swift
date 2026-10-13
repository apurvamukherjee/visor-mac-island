import ApplicationServices
import Foundation
final class AccessibilityPermission {
    static let shared = AccessibilityPermission()

    private var lastKnownAuthorization: Bool?
    private var monitoringTask: Task<Void, Never>?

    var isMonitoring: Bool {
        monitoringTask != nil
    }

    func startMonitoring(every interval: TimeInterval = 3.0) {
        stopMonitoring()
        monitoringTask = Task.detached { [weak self] in
            while !Task.isCancelled {
                _ = await self?.isAuthorized()
                do {
                    try await Task.sleep(for: .seconds(interval))
                } catch { break }
            }
        }
    }

    func stopMonitoring() {
        monitoringTask?.cancel()
        monitoringTask = nil
    }

    func request() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        AXIsProcessTrustedWithOptions(options)
    }

    /// Visor is ad-hoc signed, so macOS ties the grant to one build. After
    /// an update System Settings still shows Visor switched on, but the grant
    /// no longer matches and macOS won't prompt again. Clearing Visor's entry
    /// brings the prompt back.
    func resetAndRequest() {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/tccutil")
        process.arguments = ["reset", "Accessibility", Bundle.main.bundleIdentifier ?? "com.apurvamukherjee.visor"]
        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            print("❌ Resetting Accessibility for Visor failed: \(error)")
        }
        request()
    }

    func isAuthorized() async -> Bool {
        let granted = AXIsProcessTrusted()
        await notifyAuthorizationChange(granted)
        return granted
    }

    func ensure(promptIfNeeded: Bool) async -> Bool {
        if !AXIsProcessTrusted() {
            if promptIfNeeded {
                request()
            }
            try? await Task.sleep(for: .milliseconds(500))
        }
        return await isAuthorized()
    }

    @MainActor
    private func notifyAuthorizationChange(_ granted: Bool) {
        guard lastKnownAuthorization != granted else { return }
        lastKnownAuthorization = granted
        NotificationCenter.default.post(
            name: .accessibilityAuthorizationChanged,
            object: nil,
            userInfo: ["granted": granted]
        )
    }
}

extension Notification.Name {
    static let accessibilityAuthorizationChanged = Notification.Name("accessibilityAuthorizationChanged")
}
