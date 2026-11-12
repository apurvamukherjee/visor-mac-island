import SwiftUI

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
