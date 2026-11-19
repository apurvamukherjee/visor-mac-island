import Foundation

// Foundation only, so scripts/check-task-lists.swift can compile it alone.

/// What the quick-add bar reads out of typed text: "call bank tomorrow 5pm !!!"
/// is "call bank", due tomorrow at 5 pm, high priority.
struct QuickEntry: Equatable {
    var title: String
    var deadline: Date?
    /// A TodoPriority raw value: `!` low, `!!` medium, `!!!` high, as in Reminders.
    var priority: Int?

    /// Pass `dates: false` or `priorities: false` once one was picked by hand:
    /// then those words are the user's, and stay in the title.
    static func parse(_ text: String, dates: Bool = true, priorities: Bool = true, calendar: Calendar = .current) -> QuickEntry {
        var spans: [Range<String.Index>] = []
        var priority: Int?
        if priorities, let match = priorityPattern?.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text) {
            priority = text[range].count - 1
            spans.append(range)
        }

        var deadline: Date?
        if dates, let match = dateDetector?.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let date = match.date,
           let range = Range(match.range, in: text),
           !spans.contains(where: { $0.overlaps(range) }) {
            deadline = hasTime(text[range]) ? date : dayOnly(date, calendar: calendar)
            spans.append(range)
        }

        return QuickEntry(title: strip(spans, from: text), deadline: deadline, priority: priority)
    }

    /// The first web link in a task's notes, for the row's link button.
    static func firstURL(in text: String) -> URL? {
        linkDetector?.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))?.url
    }

    private static let priorityPattern = try? NSRegularExpression(pattern: #"(?:^|\s)(!{1,3})(?=\s|$)"#)
    private static let dateDetector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue)
    private static let linkDetector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)

    /// The detector puts noon on a bare "tomorrow" or "friday" and says nothing
    /// about it, so a time is only trusted when the text names one.
    private static func hasTime(_ text: Substring) -> Bool {
        let lower = text.lowercased()
        return lower.contains(where: \.isNumber)
            || ["noon", "midnight", "morning", "afternoon", "evening", "tonight", "night"].contains { lower.contains($0) }
    }

    /// A day without a time is due 9 am, or later today when 9 am has passed,
    /// the same as the Later today preset, so it isn't overdue on arrival.
    private static func dayOnly(_ date: Date, calendar: Calendar) -> Date {
        let now = Date()
        if calendar.isDate(date, inSameDayAs: now) { return DuePreset.laterToday.date(now: now, calendar: calendar) }
        return calendar.date(bySettingHour: 9, minute: 0, second: 0, of: date) ?? date
    }

    private static let danglingWords: Set<String> = ["at", "on", "by", "due", "for", "from"]

    private static func strip(_ spans: [Range<String.Index>], from text: String) -> String {
        guard !spans.isEmpty else { return text.trimmingCharacters(in: .whitespacesAndNewlines) }
        var result = text
        for span in spans.sorted(by: { $0.lowerBound > $1.lowerBound }) {
            result.replaceSubrange(span, with: " ")
        }
        var words = result.split(whereSeparator: \.isWhitespace).map(String.init)
        // "pay rent by friday" → "pay rent", not "pay rent by".
        while words.count > 1, let last = words.last, danglingWords.contains(last.lowercased()) {
            words.removeLast()
        }
        return words.joined(separator: " ")
    }
}
