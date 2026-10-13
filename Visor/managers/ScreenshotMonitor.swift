import Combine
import Defaults
import Foundation

/// Puts each new macOS screenshot on the shelf the moment it is saved.
///
/// Spotlight tags screenshot files with kMDItemIsScreenCapture, so a live
/// query hands over new ones as they are indexed: no polling, and no reading
/// of whichever folder the user chose for screenshots.
@MainActor
final class ScreenshotMonitor {
    static let shared = ScreenshotMonitor()

    /// Called after a screenshot lands on the shelf, so the notch can show it.
    var onCapture: (() -> Void)?

    private let query = NSMetadataQuery()
    private var gathered = false
    private var observers: [NSObjectProtocol] = []
    private var cancellables: Set<AnyCancellable> = []

    private init() {
        query.predicate = NSPredicate(format: "kMDItemIsScreenCapture == 1")
        query.searchScopes = [NSMetadataQueryUserHomeScope]
        observers = [
            NotificationCenter.default.addObserver(forName: .NSMetadataQueryDidFinishGathering, object: query, queue: .main) { _ in
                // Screenshots that already exist are not new.
                MainActor.assumeIsolated { ScreenshotMonitor.shared.gathered = true }
            },
            NotificationCenter.default.addObserver(forName: .NSMetadataQueryDidUpdate, object: query, queue: .main) { note in
                let added = note.userInfo?[NSMetadataQueryUpdateAddedItemsKey] as? [NSMetadataItem] ?? []
                let paths = added.compactMap { $0.value(forAttribute: kMDItemPath as String) as? String }
                MainActor.assumeIsolated { ScreenshotMonitor.shared.catch(paths) }
            },
        ]
        Defaults.publisher(.catchScreenshots)
            .sink { [weak self] change in
                Task { @MainActor in self?.setEnabled(change.newValue) }
            }
            .store(in: &cancellables)
    }

    private func setEnabled(_ enabled: Bool) {
        if enabled {
            gathered = false
            query.start()
        } else {
            query.stop()
        }
    }

    private func `catch`(_ paths: [String]) {
        guard gathered, !paths.isEmpty else { return }
        Task {
            var items: [ShelfItem] = []
            for path in paths {
                guard let bookmark = try? Bookmark(url: URL(fileURLWithPath: path)) else { continue }
                items.append(ShelfItem(kind: .file(bookmark: bookmark.data)))
            }
            guard !items.isEmpty else { return }
            ShelfStateViewModel.shared.add(items)
            onCapture?()
        }
    }
}
