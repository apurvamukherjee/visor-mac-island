//
//  QuickLookService.swift
//  
//
//

import Foundation
import SwiftUI
import AppKit

@MainActor
final class QuickLookService: ObservableObject {
    @Published var urls: [URL] = []
    @Published var selectedURL: URL?

    @Published var isQuickLookOpen: Bool = false

    private var accessingURLs: [URL] = []

    func show(urls: [URL]) {
        guard !urls.isEmpty else { return }
        stopAccessingCurrentURLs()
        accessingURLs = urls.filter { url in
            if url.isFileURL {
                return url.startAccessingSecurityScopedResource()
            }
            return true
        }
        self.urls = accessingURLs
        self.isQuickLookOpen = true
        self.selectedURL = accessingURLs.first
    }

    /// Called once `.quickLookPreview` clears the selection, i.e. the panel closed.
    func close() {
        stopAccessingCurrentURLs()
        urls.removeAll()
        isQuickLookOpen = false
    }

    private func stopAccessingCurrentURLs() {
        for url in accessingURLs where url.isFileURL {
            url.stopAccessingSecurityScopedResource()
        }
        accessingURLs.removeAll()
    }

    func updateSelection(urls: [URL]) {
        guard isQuickLookOpen else { return }
        show(urls: urls)
    }
}
