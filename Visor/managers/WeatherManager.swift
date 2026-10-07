import CoreLocation
import Defaults
import Foundation

/// Current conditions for the calendar strip, from Open-Meteo (free, no key).
///
/// Nothing runs in the background: the calendar asks for a refresh when the
/// notch opens, and that does nothing unless the last reading is older than
/// `maxAge`. The location is rounded to about a kilometre before it leaves
/// the Mac.
@MainActor
final class WeatherManager: NSObject, ObservableObject {
    static let shared = WeatherManager()

    struct Conditions: Equatable {
        let temperature: Measurement<UnitTemperature>
        let symbol: String
    }

    @Published private(set) var conditions: Conditions?

    private static let maxAge: TimeInterval = 30 * 60

    private let locationManager = CLLocationManager()
    private var fetchedAt: Date?
    private var isFetching = false

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func refreshIfStale() {
        guard Defaults[.showWeather], !isFetching else { return }
        if let fetchedAt, Date().timeIntervalSince(fetchedAt) < Self.maxAge { return }
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            conditions = nil
        default:
            isFetching = true
            locationManager.requestLocation()
        }
    }

    private func fetch(for coordinate: CLLocationCoordinate2D) async {
        defer { isFetching = false }
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(format: "%.2f", coordinate.latitude)),
            URLQueryItem(name: "longitude", value: String(format: "%.2f", coordinate.longitude)),
            URLQueryItem(name: "current", value: "temperature_2m,weather_code,is_day"),
        ]
        do {
            let (data, _) = try await URLSession.shared.data(from: components.url!)
            let current = try JSONDecoder().decode(Response.self, from: data).current
            conditions = Conditions(
                temperature: Measurement(value: current.temperature_2m, unit: .celsius),
                symbol: Self.symbol(code: current.weather_code, isDay: current.is_day == 1)
            )
            fetchedAt = Date()
        } catch {
            // Keeps the last reading; the next open tries again.
            print("❌ Weather fetch failed: \(error.localizedDescription)")
        }
    }

    // WMO weather interpretation codes, as Open-Meteo documents them.
    nonisolated static func symbol(code: Int, isDay: Bool) -> String {
        switch code {
        case 0: isDay ? "sun.max.fill" : "moon.stars.fill"
        case 1, 2: isDay ? "cloud.sun.fill" : "cloud.moon.fill"
        case 3: "cloud.fill"
        case 45, 48: "cloud.fog.fill"
        case 51...57: "cloud.drizzle.fill"
        case 65, 82: "cloud.heavyrain.fill"
        case 61...67, 80...82: "cloud.rain.fill"
        case 71...77, 85, 86: "cloud.snow.fill"
        case 95...99: "cloud.bolt.rain.fill"
        default: "cloud.fill"
        }
    }

    private struct Response: Decodable {
        struct Current: Decodable {
            let temperature_2m: Double
            let weather_code: Int
            let is_day: Int
        }
        let current: Current
    }
}

extension WeatherManager: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in self.refreshIfStale() }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let coordinate = locations.last?.coordinate else { return }
        Task { @MainActor in await self.fetch(for: coordinate) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("❌ Location for weather failed: \(error.localizedDescription)")
        Task { @MainActor in self.isFetching = false }
    }
}
