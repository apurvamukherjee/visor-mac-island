import AppKit
import Defaults

/// Looks for a newer release on GitHub at launch and once a day after.
///
/// It only tells: the menu bar menu and Settings > About offer the release
/// page. Installing in place (Sparkle) would need an appcast and signing
/// keys in the release flow; this needs neither.
@MainActor
final class UpdateChecker: ObservableObject {
    static let shared = UpdateChecker()

    struct Release: Equatable {
        let version: String
        let url: URL
    }

    @Published private(set) var available: Release?
    @Published private(set) var lastError: String?
    @Published private(set) var isChecking = false

    private static let latestURL = URL(string: "https://api.github.com/repos/apurvamukherjee/visor-mac-island/releases/latest")!
    private var loop: Task<Void, Never>?

    private init() {}

    func startAutomaticChecks() {
        guard loop == nil, Defaults[.checkForUpdates] else { return }
        loop = Task { [weak self] in
            while !Task.isCancelled {
                await self?.check()
                guard (try? await Task.sleep(for: .seconds(24 * 60 * 60))) != nil else { return }
            }
        }
    }

    func stopAutomaticChecks() {
        loop?.cancel()
        loop = nil
    }

    func check() async {
        isChecking = true
        defer { isChecking = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: Self.latestURL)
            let release = try JSONDecoder().decode(GitHubRelease.self, from: data)
            let current = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
            available = Self.isNewer(release.tag_name, than: current)
                ? Release(version: Self.bare(release.tag_name), url: release.html_url) : nil
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    nonisolated static func isNewer(_ tag: String, than current: String) -> Bool {
        bare(tag).compare(bare(current), options: .numeric) == .orderedDescending
    }

    private nonisolated static func bare(_ version: String) -> String {
        version.hasPrefix("v") ? String(version.dropFirst()) : version
    }

    private struct GitHubRelease: Decodable {
        let tag_name: String
        let html_url: URL
    }
}
