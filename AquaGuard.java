import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class AquaGuard {
    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        
        // Dashboard Route
        server.createContext("/", exchange -> {
            String response = "<h1> AquaGuard Dashboard</h1>" +
                              "<p>Persona: Q-Commerce (Blinkit/Zepto)</p>" +
                              "<p>Weekly Premium: DC 49.00</p>" + // [cite: 18, 85]
                              "<p>Status: Monitoring Environmental Triggers...</p>";
            exchange.sendResponseHeaders(200, response.length());
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response.getBytes());
            }
        });

        // Trigger Route (For your Demo)
        server.createContext("/trigger", exchange -> {
            // This simulates calling our Python XGBoost script
            String result = "Claim Approved: Rain > 15mm. Payout: DC 250.00";
            exchange.sendResponseHeaders(200, result.length());
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(result.getBytes());
            }
        });

        System.out.println("AquaGuard Backend running at http://localhost:8080");
        server.start();
    }
}