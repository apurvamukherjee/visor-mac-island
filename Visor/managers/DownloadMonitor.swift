import Combine
import Defaults
import Foundation

/// Progress of browser downloads into ~/Downloads, for the notch's ring.
///
/// Safari, Chrome and Firefox publish an NSProgress for each file they write
/// there (it is what draws the bar on the file's icon in Finder). Subscribing
/// to the folder hands Visor those progress objects as they come and go, so
/// there is no polling and no reading of the folder itself.
@MainActor
final class DownloadMonitor: ObservableObject {
    static let shared = DownloadMonitor()

    /// The average completion of everything downloading, or nil when idle.
    @Published private(set) var fraction: Double?

    /// How long a finished download's full ring stays before it goes.
    private static let doneLinger: Duration = .milliseconds(1500)

    private var subscriber: Any?
    private var active: [ObjectIdentifier: Progress] = [:]
    private var observations: [ObjectIdentifier: NSKeyValueObservation] = [:]
    private var lingerTask: Task<Void, Never>?
    private var cancellables: Set<AnyCancellable> = []

    private init() {
        Defaults.publisher(.showDownloadProgress)
            .sink { [weak self] change in
                Task { @MainActor in self?.setEnabled(change.newValue) }
            }
            .store(in: &cancellables)
    }

    private func setEnabled(_ enabled: Bool) {
        if enabled {
            guard subscriber == nil,
                  let downloads = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
            else { return }
            // The handlers may run off the main thread. They hop with
            // DispatchQueue.main, not Task, because main-queue blocks keep
            // their order: a quick download's unpublish must not land
            // before its publish and leave a ring that never goes away.
            subscriber = Progress.addSubscriber(forFileURL: downloads) { progress in
                // The subscriber's copy leaves fileOperationKind nil; the kind
                // only survives in userInfo.
                guard progress.userInfo[.fileOperationKindKey] as? String
                    == Progress.FileOperationKind.downloading.rawValue else { return nil }
                let id = ObjectIdentifier(progress)
                DispatchQueue.main.async { MainActor.assumeIsolated { DownloadMonitor.shared.track(progress, id: id) } }
                return { DispatchQueue.main.async { MainActor.assumeIsolated { DownloadMonitor.shared.untrack(id) } } }
            }
        } else {
            if let subscriber { Progress.removeSubscriber(subscriber) }
            subscriber = nil
            active.removeAll()
            observations.removeAll()
            lingerTask?.cancel()
            fraction = nil
        }
    }

    private func track(_ progress: Progress, id: ObjectIdentifier) {
        lingerTask?.cancel()
        active[id] = progress
        observations[id] = progress.observe(\.fractionCompleted) { _, _ in
            Task { @MainActor in DownloadMonitor.shared.recompute() }
        }
        recompute()
    }

    private func untrack(_ id: ObjectIdentifier) {
        let finished = (active[id]?.fractionCompleted ?? 0) >= 0.99
        active[id] = nil
        observations[id] = nil
        guard active.isEmpty else { return recompute() }
        guard finished else {
            fraction = nil
            return
        }
        fraction = 1
        lingerTask = Task { [weak self] in
            guard (try? await Task.sleep(for: Self.doneLinger)) != nil else { return }
            self?.fraction = nil
        }
    }

    // Browsers report many times a second; the ring only moves in whole
    // percents, so smaller changes are not published.
    private func recompute() {
        guard !active.isEmpty else { return }
        let total = active.values.reduce(0) { $0 + max(0, min(1, $1.fractionCompleted)) }
        let average = (total / Double(active.count) * 100).rounded() / 100
        if average != fraction { fraction = average }
    }
}
