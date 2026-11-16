import SwiftUI

/// The song's words as a column: the line being sung in focus, the rest dimmed
/// and softened around it, the column gliding up a line at a time.
///
/// Equatable so the 30-a-second clock above it only rebuilds the column when
/// the line (or, lit word by word, the word) changes.
struct LockScreenLyrics: View, Equatable {
    let texts: [String]
    let cursor: LyricCursor
    /// Light each word as it is sung, rather than the whole line at once.
    let byWord: Bool
    let tint: Color
    let unit: CGFloat

    /// Lines wrap, so each one's height is measured to find where the one being sung sits.
    @State private var heights: [Int: CGFloat] = [:]

    /// Where in the column the line being sung rests, from the top.
    private static let focus = 0.36
    private static let dim = 0.4
    /// Lines further than this from the one being sung are not drawn.
    private static let reach = 6

    private var fontSize: CGFloat { 34 * unit }
    private var gap: CGFloat { 22 * unit }

    static func == (old: LockScreenLyrics, new: LockScreenLyrics) -> Bool {
        old.cursor == new.cursor && old.byWord == new.byWord && old.unit == new.unit && old.tint == new.tint && old.texts == new.texts
    }

    var body: some View {
        GeometryReader { column in
            let shift = column.size.height * Self.focus - middle(of: cursor.line)
            VStack(alignment: .leading, spacing: gap) {
                ForEach(Array(texts.enumerated()), id: \.offset) { index, text in
                    let distance = abs(index - cursor.line)
                    let isSung = index == cursor.line && cursor.word >= 0
                    line(text, isSung: isSung)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { heights[index] = $0 }
                        .scaleEffect(isSung ? 1 : 0.95, anchor: .leading)
                        .blur(radius: isSung ? 0 : CGFloat(min(max(distance, 1), 4)) * 1.1 * unit)
                        .opacity(distance > Self.reach ? 0 : 1)
                        .offset(y: shift)
                        // The lines below follow a beat behind one another, so the column moves like a wave.
                        .animation(
                            .spring(duration: 0.8, bounce: 0.14).delay(Double(min(max(index - cursor.line, 0), Self.reach)) * 0.04),
                            value: cursor.line
                        )
                }
            }
            .frame(width: column.size.width, alignment: .leading)
        }
        .font(.system(size: fontSize, weight: .bold))
        .clipped()
        .mask(LinearGradient(
            stops: [
                .init(color: .clear, location: 0), .init(color: .black, location: 0.14),
                .init(color: .black, location: 0.8), .init(color: .clear, location: 1),
            ],
            startPoint: .top, endPoint: .bottom
        ))
        .shadow(color: .black.opacity(0.3), radius: 8 * unit)
    }

    private func middle(of line: Int) -> CGFloat {
        let fallback = fontSize * 1.2
        let above = (0 ..< line).reduce(0) { $0 + (heights[$1] ?? fallback) + gap }
        return above + (heights[line] ?? fallback) / 2
    }

    /// The line in dim white, with the same words in the tint laid over it.
    /// The tint comes into focus out of a blur and melts back into one, a
    /// line at a time or a word at a time.
    private func line(_ text: String, isSung: Bool) -> some View {
        let pieces = byWord ? LyricTiming.words(in: text) : [text]
        let isRightToLeft = text.unicodeScalars.contains { (0x0590 ... 0x08FF).contains($0.value) }
        // A word takes as long to arrive as it does to sing, but never so short that it snaps.
        let arrive = Animation.easeOut(duration: byWord ? max(0.5, cursor.wordDuration * 1.3) : 0.8)
        return WordFlow(spacing: fontSize * 0.27) {
            ForEach(Array(pieces.enumerated()), id: \.offset) { position, piece in
                let isLit = isSung && (!byWord || position <= cursor.word)
                Text(piece)
                    .foregroundStyle(.white.opacity(Self.dim))
                    // The words still to come wait a little out of focus.
                    .blur(radius: isSung && !isLit ? 1.2 * unit : 0)
                    .overlay {
                        Text(piece)
                            .foregroundStyle(tint)
                            .shadow(color: tint.opacity(0.4), radius: 12 * unit)
                            .blur(radius: isLit ? 0 : 7 * unit)
                            .opacity(isLit ? 1 : 0)
                    }
                    .animation(isLit ? arrive : .easeInOut(duration: 0.8), value: isLit)
            }
        }
        .environment(\.layoutDirection, isRightToLeft ? .rightToLeft : .leftToRight)
    }
}

/// Words set like a paragraph, wrapping at the width. A piece wider than the
/// width (a whole line, or a script written without spaces) wraps inside itself.
private struct WordFlow: Layout {
    let spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
        let frames = frames(in: proposal.width ?? .infinity, subviews)
        return CGSize(width: frames.map(\.maxX).max() ?? 0, height: frames.map(\.maxY).max() ?? 0)
    }

    func placeSubviews(in bounds: CGRect, proposal _: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
        for (subview, frame) in zip(subviews, frames(in: bounds.width, subviews)) {
            subview.place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func frames(in width: CGFloat, _ subviews: Subviews) -> [CGRect] {
        var origin = CGPoint.zero
        var rowHeight: CGFloat = 0
        return subviews.map { subview in
            let size = subview.sizeThatFits(ProposedViewSize(width: width, height: nil))
            if origin.x > 0, origin.x + size.width > width {
                origin = CGPoint(x: 0, y: origin.y + rowHeight)
                rowHeight = 0
            }
            defer { origin.x += size.width + spacing }
            rowHeight = max(rowHeight, size.height)
            return CGRect(origin: origin, size: size)
        }
    }
}
