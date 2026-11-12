import Foundation

/// Where playback sits in a song's line-synced lyrics.
struct LyricCursor: Equatable {
    /// The line being sung. Before the first line starts this is 0 with `word` -1.
    var line: Int
    /// The word being sung in that line, or -1 before the line's first word.
    var word: Int
    /// How far through that word, 0...1.
    var wordProgress: Double
}

/// Word timing for lyrics that are only synced per line.
///
/// LRCLIB gives one timestamp per line, so each word's moment is estimated:
/// the line's time is shared between its words by length, and a line followed
/// by a long gap is sung at a natural pace and then held on its last word
/// rather than stretched across the silence.
enum LyricTiming {
    /// Seconds a line gets per word when the gap after it is longer than that.
    static let secondsPerWord = 0.5
    static let minimumLineDuration = 1.2
    /// A last line has no next timestamp to measure against.
    static let lastLineGap = 6.0

    static func words(in text: String) -> [String] {
        text.split(whereSeparator: \.isWhitespace).map(String.init)
    }

    static func cursor(lines: [(time: Double, text: String)], at elapsed: Double) -> LyricCursor? {
        guard !lines.isEmpty else { return nil }
        guard let index = lines.lastIndex(where: { $0.time <= elapsed }) else {
            return LyricCursor(line: 0, word: -1, wordProgress: 0)
        }
        let words = words(in: lines[index].text)
        guard !words.isEmpty else { return LyricCursor(line: index, word: -1, wordProgress: 0) }

        let gap = index + 1 < lines.count ? lines[index + 1].time - lines[index].time : lastLineGap
        let duration = min(gap, max(minimumLineDuration, secondsPerWord * Double(words.count)))
        let into = elapsed - lines[index].time
        guard duration > 0, into < duration else {
            return LyricCursor(line: index, word: words.count - 1, wordProgress: 1)
        }

        // A short word still takes a beat to sing, hence the constant.
        let weights = words.map { Double($0.count) + 2 }
        var remaining = into / duration * weights.reduce(0, +)
        for (word, weight) in weights.enumerated() {
            if remaining < weight {
                return LyricCursor(line: index, word: word, wordProgress: remaining / weight)
            }
            remaining -= weight
        }
        return LyricCursor(line: index, word: words.count - 1, wordProgress: 1)
    }
}
