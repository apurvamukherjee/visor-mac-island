import SwiftUI

/// One of the five ways the lock screen shows the song's words.
///
/// Equatable so the 30-a-second clock above it only rebuilds a style when the
/// word (or, for the styles that draw it, the step within the word) changes.
struct LyricStyleView: View, Equatable {
    let style: LyricStyle
    let texts: [String]
    let cursor: LyricCursor
    /// Flips twice a second, for the terminal's cursor.
    let blink: Bool
    let tint: Color
    let unit: CGFloat

    var body: some View {
        switch style {
        case .lines: LinesLyrics(texts: texts, cursor: cursor, tint: tint, unit: unit)
        case .bigWords: BigWordsLyrics(words: nearby, wordKey: wordKey, tint: tint, unit: unit)
        case .lens: LensLyrics(words: nearby, focus: cursor.wordProgress, tint: tint, unit: unit)
        case .stars: StarsLyrics(words: LyricTiming.words(in: texts[cursor.line]), cursor: cursor, tint: tint, unit: unit)
        case .terminal: TerminalLyrics(texts: texts, cursor: cursor, blink: blink, tint: tint, unit: unit)
        }
    }

    private var wordKey: String { "\(cursor.line).\(cursor.word)" }

    /// The word being sung with the one before and after it, across line breaks.
    private var nearby: NearbyWords {
        let before = cursor.line > 0 ? LyricTiming.words(in: texts[cursor.line - 1]) : []
        let after = cursor.line + 1 < texts.count ? LyricTiming.words(in: texts[cursor.line + 1]) : []
        let all = before + LyricTiming.words(in: texts[cursor.line]) + after
        let index = before.count + cursor.word
        func word(_ position: Int) -> String? { all.indices.contains(position) ? all[position] : nil }
        return NearbyWords(previous: word(index - 1), current: cursor.word >= 0 ? word(index) : nil, next: word(index + 1))
    }
}

struct NearbyWords {
    var previous: String?
    var current: String?
    var next: String?
}

// MARK: - Lines

/// The whole song as a column, the line being sung in the middle and lit word by word.
private struct LinesLyrics: View {
    let texts: [String]
    let cursor: LyricCursor
    let tint: Color
    let unit: CGFloat

    var body: some View {
        GeometryReader { column in
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(texts.enumerated()), id: \.offset) { index, text in
                            line(index, text)
                                .padding(.vertical, 9 * unit)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id(index)
                        }
                    }
                    // Room for the first and last lines to reach the middle.
                    .padding(.vertical, column.size.height / 2)
                }
                .scrollDisabled(true)
                .onChange(of: cursor.line, initial: true) { _, line in
                    withAnimation(.spring(duration: 0.9, bounce: 0.1)) { proxy.scrollTo(line, anchor: .center) }
                }
            }
        }
        .font(.system(size: 27 * unit, weight: .bold))
        .shadow(color: .black.opacity(0.35), radius: 6 * unit)
        .mask(LinearGradient(
            stops: [
                .init(color: .clear, location: 0), .init(color: .black, location: 0.16),
                .init(color: .black, location: 0.84), .init(color: .clear, location: 1),
            ],
            startPoint: .top, endPoint: .bottom
        ))
    }

    private func line(_ index: Int, _ text: String) -> Text {
        guard index == cursor.line else { return Text(text).foregroundStyle(.white.opacity(0.34)) }
        return LyricTiming.words(in: text).enumerated().reduce(Text("")) { line, word in
            line + Text(word.element + " ").foregroundStyle(word.offset <= cursor.word ? tint : tint.opacity(0.45))
        }
    }
}

// MARK: - Big Words

/// One word at a time, as large as the screen allows, between the word just
/// sung and the one coming. A few common words bring a symbol with them.
private struct BigWordsLyrics: View {
    let words: NearbyWords
    let wordKey: String
    let tint: Color
    let unit: CGFloat

    private static let symbols: [String: String] = [
        "love": "heart.fill", "heart": "heart.fill", "light": "lightbulb.fill", "lights": "lightbulb.fill",
        "song": "music.note", "music": "music.note", "sing": "music.mic", "night": "moon.stars.fill",
        "moon": "moon.fill", "sun": "sun.max.fill", "star": "star.fill", "stars": "sparkles",
        "fire": "flame.fill", "rain": "cloud.rain.fill", "snow": "snowflake", "sky": "cloud.fill",
        "time": "clock.fill", "eyes": "eye.fill", "home": "house.fill", "world": "globe",
        "phone": "phone.fill", "car": "car.fill", "money": "dollarsign.circle.fill", "dream": "moon.zzz.fill",
        "dreams": "moon.zzz.fill", "crown": "crown.fill", "king": "crown.fill", "queen": "crown.fill",
        "ocean": "water.waves", "sea": "water.waves", "key": "key.fill", "run": "figure.run",
    ]

    var body: some View {
        VStack(spacing: 6 * unit) {
            Text(words.previous ?? " ")
                .font(.system(size: 44 * unit, weight: .heavy))
                .foregroundStyle(tint.opacity(0.55))
            HStack(spacing: 22 * unit) {
                Text(words.current ?? "♪")
                    .font(.system(size: 150 * unit, weight: .black))
                if let symbol = words.current.flatMap({ Self.symbols[$0.lowercased().trimmingCharacters(in: .punctuationCharacters)] }) {
                    Image(systemName: symbol).font(.system(size: 96 * unit, weight: .bold))
                }
            }
            .foregroundStyle(tint)
            .shadow(color: tint.opacity(0.45), radius: 26 * unit)
            .id(wordKey)
            // Words come several a second: the old one leaves at once, or two
            // would always be on screen blurring into each other.
            .transition(.asymmetric(insertion: .scale(scale: 0.86).combined(with: .opacity), removal: .identity))
            .animation(.spring(duration: 0.22, bounce: 0.3), value: wordKey)
            Text(words.next ?? " ")
                .font(.system(size: 40 * unit, weight: .bold).italic())
                .foregroundStyle(.white)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.3)
        .shadow(color: .black.opacity(0.35), radius: 8 * unit)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Lens

/// The word swells under a lens that crosses it as it is sung. The next word
/// waits below on a tag.
private struct LensLyrics: View {
    let words: NearbyWords
    /// 0...1 across the word: where the lens is.
    let focus: Double
    let tint: Color
    let unit: CGFloat

    /// How much of the word the lens covers, as a share of its width.
    private static let lensWidth = 0.24
    private static let magnification = 0.5

    var body: some View {
        VStack(spacing: 4 * unit) {
            Text(words.previous ?? " ")
                .font(.system(size: 44 * unit, weight: .heavy))
                .foregroundStyle(tint.opacity(0.55))
            lensed(words.current ?? "♪")
                .foregroundStyle(tint)
                .frame(height: 190 * unit)
            Text(words.next ?? " ")
                .font(.system(size: 34 * unit, weight: .black).italic())
                .foregroundStyle(.black)
                .padding(.horizontal, 12 * unit)
                .padding(.vertical, 3 * unit)
                .background(tint, in: RoundedRectangle(cornerRadius: 5 * unit))
                .rotationEffect(.degrees(-2))
                .opacity(words.next == nil ? 0 : 1)
        }
        .lineLimit(1)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func lensed(_ word: String) -> some View {
        let letters = Array(word)
        // A long word starts smaller so its swollen middle still fits the screen.
        let base = min(118, 1500 / CGFloat(max(letters.count, 1))) * unit
        return HStack(alignment: .center, spacing: 0) {
            ForEach(Array(letters.enumerated()), id: \.offset) { index, letter in
                let distance = (Double(index) + 0.5) / Double(letters.count) - focus
                let swell = exp(-distance * distance / (2 * Self.lensWidth * Self.lensWidth))
                Text(String(letter))
                    .font(.system(size: base * (1 + Self.magnification * swell), weight: .black))
            }
        }
        .fixedSize()
    }
}

// MARK: - Stars

/// The line as a constellation: a star for each word, joined up in the order
/// they are sung.
private struct StarsLyrics: View {
    let words: [String]
    let cursor: LyricCursor
    let tint: Color
    let unit: CGFloat

    var body: some View {
        GeometryReader { sky in
            let stars = Self.stars(count: words.count, line: cursor.line, in: sky.size)
            ZStack {
                Canvas { context, _ in draw(stars, in: &context) }
                ForEach(Array(words.enumerated()), id: \.offset) { index, word in
                    let isCurrent = index == cursor.word
                    Text(word)
                        // Drawn large and scaled down, so growing into the
                        // current word is a transform and stays sharp.
                        .font(.system(size: 60 * unit, weight: .heavy))
                        .scaleEffect(isCurrent ? 1 : 0.3)
                        .foregroundStyle(isCurrent ? tint : index < cursor.word ? tint.opacity(0.75) : .white.opacity(0.32))
                        .shadow(color: isCurrent ? tint.opacity(0.7) : .clear, radius: 14 * unit)
                        .fixedSize()
                        .position(x: stars[index].x, y: stars[index].y + (isCurrent ? 58 : 22) * unit)
                }
            }
            .animation(.spring(duration: 0.4, bounce: 0.2), value: cursor.word)
            .id(cursor.line)
            .transition(.opacity)
        }
        .animation(.easeInOut(duration: 0.5), value: cursor.line)
    }

    private func draw(_ stars: [CGPoint], in context: inout GraphicsContext) {
        var sung = Path()
        var ahead = Path()
        for index in stars.indices.dropFirst() {
            if index <= cursor.word {
                sung.move(to: stars[index - 1])
                sung.addLine(to: stars[index])
            } else {
                ahead.move(to: stars[index - 1])
                ahead.addLine(to: stars[index])
            }
        }
        context.stroke(ahead, with: .color(tint.opacity(0.16)), lineWidth: unit)
        context.stroke(sung, with: .color(tint.opacity(0.7)), lineWidth: 1.4 * unit)
        for (index, star) in stars.enumerated() {
            let isCurrent = index == cursor.word
            context.fill(
                Self.sparkle(at: star, radius: (isCurrent ? 14 : 7) * unit),
                with: .color(index <= cursor.word ? tint : tint.opacity(0.4))
            )
            if isCurrent {
                let ring = 27 * unit
                context.stroke(
                    Path(ellipseIn: CGRect(x: star.x - ring, y: star.y - ring, width: ring * 2, height: ring * 2)),
                    with: .color(tint.opacity(0.55)), lineWidth: 1.2 * unit
                )
            }
        }
    }

    /// A four-pointed star: long tips on the axes, pinched in between.
    private static func sparkle(at center: CGPoint, radius: CGFloat) -> Path {
        var path = Path()
        for step in 0 ..< 8 {
            let angle = Double(step) * .pi / 4
            let reach = step.isMultiple(of: 2) ? radius : radius * 0.2
            let point = CGPoint(x: center.x + cos(angle) * reach, y: center.y + sin(angle) * reach)
            if step == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }

    /// Left to right so the line still reads in order, at heights that are
    /// random but the same every time this line comes round.
    private static func stars(count: Int, line: Int, in size: CGSize) -> [CGPoint] {
        var generator = SplitMix64(state: UInt64(truncatingIfNeeded: line) &* 0x9E37_79B9_7F4A_7C15 &+ 1)
        let inset = size.width * 0.08
        let step = (size.width - inset * 2) / CGFloat(max(count, 1))
        return (0 ..< count).map { index in
            CGPoint(
                x: inset + (CGFloat(index) + 0.5 + .random(in: -0.28 ... 0.28, using: &generator)) * step,
                // The lower part is left clear for the current word, drawn under its star.
                y: size.height * .random(in: 0.1 ... 0.68, using: &generator)
            )
        }
    }
}

/// A seedable generator; the system one cannot be seeded.
private struct SplitMix64: RandomNumberGenerator {
    var state: UInt64

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var mixed = state
        mixed = (mixed ^ (mixed >> 30)) &* 0xBF58_476D_1CE4_E5B9
        mixed = (mixed ^ (mixed >> 27)) &* 0x94D0_49BB_1331_11EB
        return mixed ^ (mixed >> 31)
    }
}

// MARK: - Terminal

/// The line typed out at a prompt, a letter at a time, over the two before it.
private struct TerminalLyrics: View {
    let texts: [String]
    let cursor: LyricCursor
    let blink: Bool
    let tint: Color
    let unit: CGFloat

    private static let caret = Color(red: 1, green: 0.32, blue: 0.3)

    var body: some View {
        let words = LyricTiming.words(in: texts[cursor.line])
        let isDone = cursor.word == words.count - 1 && cursor.wordProgress >= 1
        VStack(alignment: .leading, spacing: 8 * unit) {
            if cursor.line >= 2 {
                Text(Self.dotted(texts[cursor.line - 2]))
                    .font(.system(size: 26 * unit, weight: .bold, design: .monospaced))
                    .foregroundStyle(tint.opacity(0.28))
                    .padding(.leading, 96 * unit)
            }
            if cursor.line >= 1 {
                Text(Self.dotted(texts[cursor.line - 1]))
                    .font(.system(size: 36 * unit, weight: .bold, design: .monospaced))
                    .foregroundStyle(tint.opacity(0.6))
                    .padding(.leading, 48 * unit)
            }
            HStack(spacing: 14 * unit) {
                Text(typed(words))
                    .font(.system(size: 54 * unit, weight: .bold, design: .monospaced))
                    .foregroundStyle(tint)
                    .shadow(color: tint.opacity(0.55), radius: 14 * unit)
                Rectangle()
                    .fill(Self.caret)
                    .frame(width: 28 * unit, height: 56 * unit)
                    // Solid while typing, blinking once the line is out.
                    .opacity(isDone && !blink ? 0 : 1)
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(.smooth(duration: 0.3), value: cursor.line)
    }

    private func typed(_ words: [String]) -> String {
        guard cursor.word >= 0, cursor.word < words.count else { return "" }
        let current = words[cursor.word]
        let letters = Int((cursor.wordProgress * Double(current.count)).rounded(.up))
        return (words[..<cursor.word] + [String(current.prefix(max(letters, 1)))]).joined(separator: " ").lowercased()
    }

    private static func dotted(_ text: String) -> String {
        LyricTiming.words(in: text)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { !$0.isEmpty }
            .joined(separator: ".")
            .lowercased()
    }
}
