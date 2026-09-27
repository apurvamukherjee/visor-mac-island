

import Foundation
import AppKit
import UniformTypeIdentifiers

enum TempFileType {
    case data(Data, suggestedName: String?)
    case text(String)
}

class TemporaryFileStorageService {
    static let shared = TemporaryFileStorageService()
    
    // MARK: - Public Interface
    
    func removeTemporaryFileIfNeeded(at url: URL) {
        let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory())

        guard url.path.hasPrefix(tempDirectory.path) else {
            print("Attempted to remove temporary file outside temp directory: \(url.path)")
            return
        }

        let folderURL = url.deletingLastPathComponent()

        do {
            try FileManager.default.removeItem(at: url)
            print("Deleted file: \(url.path)")

            let contents = try FileManager.default.contentsOfDirectory(atPath: folderURL.path)
            if contents.isEmpty {
                try FileManager.default.removeItem(at: folderURL)
                print("Folder was empty, deleted folder: \(folderURL.path)")
            } else {
                print("Folder not deleted — it still contains \(contents.count) item(s).")
            }

        } catch {
            print("Error: \(error.localizedDescription)")
        }
    }
    
    // Visor: was a sync twin behind an async withCheckedContinuation wrapper.
    /// Creates a temporary file and tracks it for manual cleanup
    func createTempFile(for type: TempFileType) async -> URL? {
        let tempDir = URL(fileURLWithPath: NSTemporaryDirectory())
        let uuid = UUID().uuidString
        let data: Data
        let filename: String
        switch type {
        case .data(let fileData, let suggestedName):
            data = fileData
            filename = suggestedName ?? ".dat"
        case .text(let string):
            data = Data(string.utf8)
            filename = "\(uuid).txt"
        }

        let dirURL = tempDir.appendingPathComponent(uuid, isDirectory: true)
        let fileURL = dirURL.appendingPathComponent(filename)
        do {
            try FileManager.default.createDirectory(at: dirURL, withIntermediateDirectories: true)
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("Error: \(error)")
            return nil
        }
    }
    
    func createZip(from urls: [URL]) async -> URL? {
        let fm = FileManager.default
        let workingDir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("zip_\(UUID().uuidString)", isDirectory: true)
        do {
            try fm.createDirectory(at: workingDir, withIntermediateDirectories: true)
        } catch {
            print("❌ Failed to create zip working directory: \(error)")
            return nil
        }

        // A coordinated read zips a folder with the folder as the archive root; a lone file
        // would come back unzipped, so it keeps zip -j to land at the root like Finder's Compress.
        if urls.count == 1, let file = urls.first,
           (try? file.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) != true {
            let archiveURL = workingDir.appendingPathComponent("\(file.lastPathComponent).zip")
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/zip")
            proc.arguments = ["-j", "-q", archiveURL.path, file.path]
            do {
                try proc.run()
                proc.waitUntilExit()
            } catch {
                print("❌ Failed to run zip: \(error)")
                return nil
            }
            return proc.terminationStatus == 0 ? archiveURL : nil
        }

        var source = urls.first
        if urls.count > 1 {
            let staging = workingDir.appendingPathComponent("Archive", isDirectory: true)
            do {
                try fm.createDirectory(at: staging, withIntermediateDirectories: true)
                for src in urls {
                    var dest = staging.appendingPathComponent(src.lastPathComponent)
                    if fm.fileExists(atPath: dest.path) {
                        dest = staging.appendingPathComponent("\(UUID().uuidString)_\(src.lastPathComponent)")
                    }
                    try fm.copyItem(at: src, to: dest)
                }
            } catch {
                print("❌ Failed to stage items for zip: \(error)")
                return nil
            }
            source = staging
        }
        guard let source else { return nil }
        // Only the archive stays in the temp folder; the staged copies are disposable.
        defer { if urls.count > 1 { try? fm.removeItem(at: source) } }

        let archiveURL = workingDir.appendingPathComponent("\(source.lastPathComponent).zip")
        var coordinationError: NSError?
        var moveError: Error?
        NSFileCoordinator().coordinate(readingItemAt: source, options: .forUploading, error: &coordinationError) { zipURL in
            do {
                try fm.moveItem(at: zipURL, to: archiveURL)
            } catch {
                moveError = error
            }
        }
        if let error = coordinationError ?? moveError {
            print("❌ Failed to zip: \(error)")
            return nil
        }
        return archiveURL
    }
    
}
