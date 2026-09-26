import AppKit
import Combine
import Defaults

@MainActor
final class FullscreenMediaDetector: ObservableObject {
    static let shared = FullscreenMediaDetector()
    
    @Published var fullscreenStatus: [String: Bool] = [:]
    
    private var spaces: [String: [String]]?
    private init() {
        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.activeSpaceDidChangeNotification, object: nil, queue: .main
        ) { _ in
            Task { @MainActor in FullscreenMediaDetector.shared.refresh() }
        }
        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main
        ) { _ in
            Task { @MainActor in FullscreenMediaDetector.shared.refresh() }
        }
        Task { @MainActor in refresh() }
    }
    
    private func refresh() {
        let current = FullScreenSpaces.current()
        guard current != spaces else { return }
        spaces = current
        updateStatus(with: current)
    }
    
    private func updateStatus(with spaces: [String: [String]]) {
        var newStatus: [String: Bool] = [:]
        
        for (uuid, runningApps) in spaces {
            let shouldDetect: Bool
            if Defaults[.hideNotchOption] == .nowPlayingOnly, let musicSourceBundle = MusicManager.shared.bundleIdentifier  {
                shouldDetect = runningApps.contains(musicSourceBundle)
            } else {
                shouldDetect = true
            }
            newStatus[uuid] = shouldDetect
        }
        
        self.fullscreenStatus = newStatus
    }
}
