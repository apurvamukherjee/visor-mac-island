// Run from the repo root:
//   swiftc -parse-as-library Visor/models/LyricTiming.swift scripts/check-lyric-timing.swift -o /tmp/check-lyric-timing \
//     && /tmp/check-lyric-timing

@main
enum CheckLyricTiming {
    static func main() {
        let lines: [(time: Double, text: String)] = [
            (10, "one two three four"),
            (12, "hello"),
            (40, ""),
        ]

        precondition(LyricTiming.cursor(lines: [], at: 5) == nil)
        precondition(LyricTiming.cursor(lines: lines, at: 0) == LyricCursor(line: 0, word: -1, wordProgress: 0))

        // Four words over the 2 s to the next line: weights 5, 5, 7, 6 of 23.
        let start = LyricTiming.cursor(lines: lines, at: 10)!
        precondition(start.line == 0 && start.word == 0 && start.wordProgress == 0)
        let third = LyricTiming.cursor(lines: lines, at: 10 + 2 * 12 / 23)!
        precondition(third.line == 0 && third.word == 2 && abs(third.wordProgress - 2.0 / 7) < 1e-9)

        // Words never run backwards as time moves on.
        var last = -1
        for step in 0 ..< 200 {
            let cursor = LyricTiming.cursor(lines: lines, at: 10 + Double(step) * 0.01)!
            precondition(cursor.line == 0 && cursor.word >= last)
            last = cursor.word
        }
        precondition(last == 3)

        // One word before a 28 s gap is sung in 1.2 s, then held.
        precondition(abs(LyricTiming.cursor(lines: lines, at: 12.6)!.wordProgress - 0.5) < 1e-9)
        precondition(LyricTiming.cursor(lines: lines, at: 30) == LyricCursor(line: 1, word: 0, wordProgress: 1))

        // An empty line has no word to point at.
        precondition(LyricTiming.cursor(lines: lines, at: 41) == LyricCursor(line: 2, word: -1, wordProgress: 0))
        print("lyric timing ok")
    }
}
