import SwiftUI

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
