require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.WEATHERAPI_KEY;

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Quevano Weather" });
});

app.get("/api/weather", async (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

  if (city.length < 2 || city.length > 100) {
    return res.status(400).json({ error: "Enter a city name between 2 and 100 characters." });
  }

  if (!API_KEY || API_KEY === "put_your_api_key_here") {
    return res.status(503).json({
      error: "Weather data is not connected yet. Add your WeatherAPI.com key to the .env file, then restart the app."
    });
  }

  try {
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("q", city);
    url.searchParams.set("days", "3");
    url.searchParams.set("aqi", "no");
    url.searchParams.set("alerts", "no");

    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const data = await response.json();

    if (!response.ok || data.error) {
      const apiCode = data?.error?.code;
      if (apiCode === 1006) {
        return res.status(404).json({ error: `We couldn't find "${city}". Check the spelling and try again.` });
      }
      if (apiCode === 1002 || apiCode === 2006 || apiCode === 2007) {
        return res.status(502).json({ error: "The weather service rejected the API key. Check your .env configuration." });
      }
      return res.status(502).json({ error: "The weather service could not return data. Please try again later." });
    }

    const forecast = (data.forecast.forecastday || []).map((day) => ({
      date: day.date,
      icon: day.day.condition.icon,
      condition: day.day.condition.text,
      max_c: day.day.maxtemp_c,
      min_c: day.day.mintemp_c,
      max_f: day.day.maxtemp_f,
      min_f: day.day.mintemp_f,
      chance_of_rain: day.day.chance_of_rain ?? 0,
      avg_humidity: day.day.avghumidity,
    }));

    return res.json({
      location: data.location,
      current: data.current,
      forecast,
      provider: "WeatherAPI.com"
    });
  } catch (error) {
    console.error("Weather request failed:", error.message);
    return res.status(502).json({ error: "Could not reach the weather service. Check your internet connection and try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Quevano Weather is running at http://localhost:${PORT}`);
});
