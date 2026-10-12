document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  const form = document.getElementById("bookingForm");
  const popup = document.getElementById("popup");
  const popupTitle = document.getElementById("popupTitle");
  const popupMessage = document.getElementById("popupMessage");
  const popupClose = document.getElementById("popupClose");
  const roomSelect = document.getElementById("roomType");
  const guestsInput = document.getElementById("guests");
  const submitButton = form.querySelector('[type="submit"]');
  let popupAction = "";
  const roomCapacities = {"Deluxe Room": 2, "Premium Room": 3, "Luxury Suite": 4};
  const today = (() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  })();

  if (loader) {
    const hideLoader = () => loader.remove();
    window.addEventListener("load", hideLoader, {once: true});
    window.setTimeout(hideLoader, 1500);
  }

  menuBtn?.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("show");
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  });
  navLinks?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    navLinks.classList.remove("show");
    menuBtn?.setAttribute("aria-expanded", "false");
  }));

  ["quickCheckIn", "quickCheckOut", "checkin", "checkout"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.min = today;
  });

  function connectDateRange(checkinId, checkoutId) {
    const checkin = document.getElementById(checkinId);
    const checkout = document.getElementById(checkoutId);
    if (!checkin || !checkout) return;

    const updateCheckout = () => {
      checkout.min = checkin.value || today;
      if (checkin.value && checkout.value && checkout.value <= checkin.value) {
        checkout.setCustomValidity("Check-out must be after check-in.");
      } else {
        checkout.setCustomValidity("");
      }
    };
    checkin.addEventListener("change", updateCheckout);
    checkout.addEventListener("change", updateCheckout);
    checkout.addEventListener("input", updateCheckout);
    updateCheckout();
  }

  connectDateRange("quickCheckIn", "quickCheckOut");
  connectDateRange("checkin", "checkout");

  function updateGuestLimit() {
    const capacity = roomCapacities[roomSelect.value];
    guestsInput.max = capacity || 4;
    guestsInput.setCustomValidity("");
    if (capacity && Number(guestsInput.value) > capacity) {
      guestsInput.setCustomValidity(`${roomSelect.value} allows up to ${capacity} guests.`);
    }
  }

  roomSelect?.addEventListener("change", updateGuestLimit);
  guestsInput?.addEventListener("input", updateGuestLimit);

  document.querySelectorAll(".select-room").forEach(button => {
    button.addEventListener("click", () => {
      roomSelect.value = button.dataset.room;
      updateGuestLimit();
      document.getElementById("booking").scrollIntoView({behavior: "smooth"});
      roomSelect.focus({preventScroll: true});
    });
  });

  document.getElementById("availabilityBtn")?.addEventListener("click", () => {
    const checkin = document.getElementById("quickCheckIn");
    const checkout = document.getElementById("quickCheckOut");
    if (!checkin.value) {
      checkin.setCustomValidity("Please select a check-in date.");
      checkin.reportValidity();
      checkin.setCustomValidity("");
      return;
    }
    if (!checkout.value || checkout.value <= checkin.value) {
      checkout.setCustomValidity("Choose a check-out date after check-in.");
      checkout.reportValidity();
      checkout.setCustomValidity("");
      return;
    }

    document.getElementById("checkin").value = checkin.value;
    document.getElementById("checkout").value = checkout.value;
    guestsInput.value = document.getElementById("quickGuests").value;
    showPopup(
      "Booking details ready",
      "Your dates and guest count are ready. Choose a room to continue.",
      "Continue to booking",
      "quick-book"
    );
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    updateGuestLimit();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Processing booking...";
    try {
      const fields = Object.fromEntries(new FormData(form));
      fields.guests = Number(fields.guests);
      const response = await fetch(form.action, {
        method: form.method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(fields),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please check your booking details.");
      showBookingConfirmation(result.booking);
    } catch (error) {
      showPopup(
        "Booking could not be completed",
        error.message || "The local booking server could not be reached. Start it with npm start and try again.",
        "Close",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Confirm Booking";
    }
  });

  function showPopup(title, content, buttonText, action) {
    popupTitle.textContent = title;
    popupMessage.replaceChildren();
    if (typeof content === "string") {
      popupMessage.textContent = content;
    } else {
      popupMessage.append(content);
    }
    popupClose.textContent = buttonText;
    popupAction = action;
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    popupClose.focus();
  }

  function showBookingConfirmation(booking) {
    const message = document.createElement("div");
    const introduction = document.createElement("p");
    introduction.className = "confirmation-intro";
    introduction.textContent = `Thank you, ${booking.guestName}. Your reservation is confirmed.`;
    message.append(introduction);

    const details = document.createElement("dl");
    details.className = "booking-summary";
    const currency = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    const rows = [
      ["Email", booking.email],
      ["Room", booking.room],
      ["Check-in", booking.checkin],
      ["Check-out", booking.checkout],
      ["Guests", String(booking.guests)],
      ["Number of nights", String(booking.nights)],
      ["Price per night", currency.format(booking.pricePerNight)],
      ["Total price", currency.format(booking.totalPrice)],
    ];

    rows.forEach(([label, value], index) => {
      const row = document.createElement("div");
      row.className = index === rows.length - 1 ? "booking-summary-row total" : "booking-summary-row";
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      details.append(row);
    });

    message.append(details);
    showPopup("Booking confirmed", message, "Back to Royal Stay", "confirmation");
  }

  function closePopup() {
    popup?.classList.remove("show");
    popup?.setAttribute("aria-hidden", "true");
    const action = popupAction;
    popupAction = "";
    if (action === "quick-book") {
      document.getElementById("booking").scrollIntoView({behavior: "smooth"});
      roomSelect.focus({preventScroll: true});
    } else if (action === "confirmation" || action === "error") {
      submitButton.focus({preventScroll: true});
    }
  }

  popupClose?.addEventListener("click", closePopup);
  popup?.addEventListener("click", event => {
    if (event.target === popup) closePopup();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePopup();
  });
});