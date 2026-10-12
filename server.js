const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const publicFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
]);
const rooms = {
  "Deluxe Room": { pricePerNight: 3500, maxGuests: 2 },
  "Premium Room": { pricePerNight: 4500, maxGuests: 3 },
  "Luxury Suite": { pricePerNight: 6000, maxGuests: 4 },
};

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const contentType = (request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new RequestError(415, "Send the booking as JSON.");
  }

  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) {
      tooLarge = true;
    } else if (!tooLarge) {
      chunks.push(chunk);
    }
  }
  if (tooLarge) {
    throw new RequestError(413, "The booking request is too large.");
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "The booking request is not valid JSON.");
  }
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateBooking(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RequestError(400, "Enter valid booking details.");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const checkin = typeof input.checkin === "string" ? input.checkin : "";
  const checkout = typeof input.checkout === "string" ? input.checkout : "";
  const room = typeof input.room === "string" ? input.room : "";
  const guests = input.guests;
  const errors = [];

  if (!name) {
    errors.push("Full name is required.");
  } else if (name.length > 100) {
    errors.push("Full name must be 100 characters or fewer.");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }

  const arrival = parseDate(checkin);
  const departure = parseDate(checkout);
  if (!arrival) {
    errors.push("Enter a valid check-in date.");
  } else if (checkin < localToday()) {
    errors.push("Check-in cannot be in the past.");
  }
  if (!departure) {
    errors.push("Enter a valid check-out date.");
  } else if (arrival && departure <= arrival) {
    errors.push("Check-out must be after check-in.");
  }

  if (!Number.isInteger(guests) || guests < 1 || guests > 4) {
    errors.push("Guests must be a whole number between 1 and 4.");
  }
  const selectedRoom = rooms[room];
  if (!selectedRoom) {
    errors.push("Select a valid room.");
  } else if (Number.isInteger(guests) && guests > selectedRoom.maxGuests) {
    errors.push(`${room} allows up to ${selectedRoom.maxGuests} guests.`);
  }

  if (errors.length) {
    throw new RequestError(422, errors.join(" "));
  }

  const nights = (departure.getTime() - arrival.getTime()) / 86_400_000;
  return {
    guestName: name,
    email,
    checkin,
    checkout,
    guests,
    room,
    nights,
    pricePerNight: selectedRoom.pricePerNight,
    totalPrice: nights * selectedRoom.pricePerNight,
  };
}

async function handleRequest(request, response) {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/bookings") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Use POST to submit a booking." });
      return;
    }

    try {
      const booking = validateBooking(await readJson(request));
      sendJson(response, 201, { booking });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      sendJson(response, status, {
        error: status === 500 ? "The booking could not be processed. Please try again." : error.message,
      });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed.");
    return;
  }

  const file = publicFiles.get(url.pathname);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Page not found.");
    return;
  }

  try {
    const content = await fs.readFile(path.join(__dirname, file[0]));
    response.writeHead(200, {
      "Content-Type": file[1],
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The website file could not be loaded.");
  }
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) {
      sendJson(response, 500, { error: "An unexpected server error occurred." });
    } else {
      response.destroy();
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Royal Stay is running at http://localhost:${port}`);
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the other program and run npm start again.`);
    process.exitCode = 1;
  } else {
    throw error;
  }
});
