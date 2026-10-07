import Foundation

/// Finds the video-call link in a calendar event: its URL field first, then
/// the location, then the notes, which is where Zoom, Meet, Teams and Webex
/// invitations put it.
enum MeetingLink {
    /// A host matches a suffix exactly or as a subdomain, so `acme.zoom.us`
    /// counts and `notzoom.us` does not.
    private static let hostSuffixes = [
        "zoom.us", "zoomgov.com",
        "meet.google.com",
        "teams.microsoft.com", "teams.live.com",
        "webex.com",
        "whereby.com",
        "meet.jit.si",
    ]

    private static let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)

    static func find(url: URL?, location: String?, notes: String?) -> URL? {
        if let url, isMeeting(url) { return url }
        for text in [location, notes].compactMap({ $0 }) where !text.isEmpty {
            if let link = firstMeeting(in: text) { return link }
        }
        return nil
    }

    static func isMeeting(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              let host = url.host()?.lowercased()
        else { return false }
        return hostSuffixes.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    private static func firstMeeting(in text: String) -> URL? {
        let range = NSRange(text.startIndex..., in: text)
        return detector?.matches(in: text, range: range).lazy.compactMap(\.url).first(where: isMeeting)
    }
}
