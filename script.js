(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  const themes = [
    {name:"Meroza Maroon",accent:"#7A2130",soft:"#DFC1C6"},
    {name:"Saffron",accent:"#9A5B18",soft:"#E2C89E"},
    {name:"Leaf",accent:"#4F6B43",soft:"#C3D2BC"},
    {name:"Terracotta",accent:"#99503B",soft:"#DDB9AF"},
    {name:"Plum",accent:"#6E4E67",soft:"#CCBAC7"},
    {name:"Teal",accent:"#3D7069",soft:"#BBD5D1"},
    {name:"Cocoa",accent:"#6A5142",soft:"#CFC3BA"},
    {name:"Indigo",accent:"#535E7A",soft:"#C4C9D6"}
  ];
  const fonts = ["Cormorant Garamond","Playfair Display","Bodoni Moda","DM Serif Display","Prata","Manrope"];

  const dishCards = $$(".dish-card");
  const dishes = Object.fromEntries(dishCards.map(card => {
    const img = $("img", card);
    return [card.dataset.dishId, {
      id: card.dataset.dishId,
      name: card.dataset.name,
      category: card.dataset.category,
      badge: card.dataset.badge || "",
      price: Number(card.dataset.price),
      search: card.dataset.search,
      description: $(".dish-info > p", card)?.textContent.trim() || "",
      image: img?.src || ""
    }];
  }));

  let activeFilter = "All";
  let orderMode = "Delivery";
  let selectedLocation = "New Shimla";
  let selectedBranch = "Meroza Shimla";
  let cart = [];
  let couponValue = 0;
  let currentDish = null;
  let currentMode = "light";
  let themeIndex = 0;
  let fontIndex = 0;
  let colourLocked = false;
  let fontLocked = false;

  const money = value => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(value)));

  function safeOpenDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    body.classList.add("locked");
  }

  function safeCloseDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    body.classList.remove("locked");
  }

  function hexToRgb(hex) {
    const clean = String(hex).replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }

  function lightMix(hex, amount = 0.65) {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#DFC1C6";
    const mixed = rgb.map(value => Math.round(value + (255 - value) * amount));
    return `#${mixed.map(value => value.toString(16).padStart(2, "0")).join("")}`;
  }

  function applyTheme(theme, selected = -1) {
    const rgb = hexToRgb(theme.accent);
    if (!rgb) return;
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-rgb", rgb.join(","));
    document.documentElement.style.setProperty("--accent-soft", theme.soft || lightMix(theme.accent));
    const customColour = $("#customColour");
    const customHex = $("#customHex");
    if (customColour) customColour.value = theme.accent;
    if (customHex) customHex.value = theme.accent.toUpperCase();
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme.accent;
    $$("#themeSwatches button").forEach((button, index) => button.classList.toggle("active", index === selected));
  }

  function applyFont(font) {
    document.documentElement.style.setProperty("--display", `"${font}", Georgia, serif`);
    const select = $("#fontSelect");
    if (select) select.value = font;
  }

  function resolveMode(mode) {
    currentMode = mode;
    const applied = mode === "system" ? (systemDark.matches ? "dark" : "light") : mode;
    document.documentElement.dataset.mode = applied;
    const status = $("#modeStatus");
    if (status) status.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    $$("[data-mode-value]").forEach(button => button.classList.toggle("active", button.dataset.modeValue === mode));
  }

  function updateLockUI() {
    const colourButton = $("#lockColour");
    const fontButton = $("#lockFont");
    const bothButton = $("#lockBoth");
    colourButton?.classList.toggle("locked", colourLocked);
    fontButton?.classList.toggle("locked", fontLocked);
    bothButton?.classList.toggle("locked", colourLocked && fontLocked);
    if (colourButton) {
      const status = $("b", colourButton);
      if (status) status.textContent = colourLocked ? "Locked" : "Unlocked";
    }
    if (fontButton) {
      const status = $("b", fontButton);
      if (status) status.textContent = fontLocked ? "Locked" : "Unlocked";
    }
    const colourStatus = $("#colourStatus");
    const fontStatus = $("#fontStatus");
    if (colourStatus) colourStatus.textContent = colourLocked ? "Locked" : (reducedMotion ? "Manual" : "Auto · 3 sec");
    if (fontStatus) fontStatus.textContent = fontLocked ? "Locked" : (reducedMotion ? "Manual" : "Auto · 3 sec");
    if (bothButton) bothButton.textContent = colourLocked && fontLocked ? "Unlock both" : "Lock both";
  }

  function initCustomizer() {
    const swatches = $("#themeSwatches");
    if (swatches) {
      themes.forEach((theme, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.title = theme.name;
        button.style.setProperty("--swatch", theme.accent);
        button.addEventListener("click", () => {
          themeIndex = index;
          applyTheme(theme, index);
        });
        swatches.appendChild(button);
      });
    }

    applyTheme(themes[0], 0);
    applyFont(fonts[0]);
    resolveMode("light");
    updateLockUI();

    if (!reducedMotion) {
      window.setInterval(() => {
        if (!colourLocked) {
          themeIndex = (themeIndex + 1) % themes.length;
          applyTheme(themes[themeIndex], themeIndex);
        }
      }, 3000);
      window.setInterval(() => {
        if (!fontLocked) {
          fontIndex = (fontIndex + 1) % fonts.length;
          applyFont(fonts[fontIndex]);
        }
      }, 3000);
    }

    $("#customColour")?.addEventListener("input", event => {
      const value = event.target.value.toUpperCase();
      applyTheme({accent:value, soft:lightMix(value)});
    });
    $("#customHex")?.addEventListener("change", event => {
      let value = event.target.value.trim();
      if (!value.startsWith("#")) value = `#${value}`;
      if (hexToRgb(value)) applyTheme({accent:value.toUpperCase(), soft:lightMix(value)});
      else event.target.value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    });
    $("#fontSelect")?.addEventListener("change", event => {
      fontIndex = Math.max(0, fonts.indexOf(event.target.value));
      applyFont(event.target.value);
    });
    $("#lockColour")?.addEventListener("click", () => {
      colourLocked = !colourLocked;
      updateLockUI();
    });
    $("#lockFont")?.addEventListener("click", () => {
      fontLocked = !fontLocked;
      updateLockUI();
    });
    $("#lockBoth")?.addEventListener("click", () => {
      const next = !(colourLocked && fontLocked);
      colourLocked = next;
      fontLocked = next;
      updateLockUI();
    });
    $("#resetCustomizer")?.addEventListener("click", () => {
      colourLocked = false;
      fontLocked = false;
      themeIndex = 0;
      fontIndex = 0;
      applyTheme(themes[0], 0);
      applyFont(fonts[0]);
      resolveMode("light");
      updateLockUI();
    });
    $$("[data-mode-value]").forEach(button => button.addEventListener("click", () => resolveMode(button.dataset.modeValue)));
    systemDark.addEventListener?.("change", () => currentMode === "system" && resolveMode("system"));

    const customizer = $(".customizer");
    const toggle = $("#customizerToggle");
    const close = $("#customizerClose");
    const setOpen = open => {
      customizer?.classList.toggle("open", open);
      toggle?.setAttribute("aria-expanded", String(open));
    };
    toggle?.addEventListener("click", () => setOpen(!customizer?.classList.contains("open")));
    close?.addEventListener("click", () => setOpen(false));
  }

  function initNavigation() {
    const nav = $("#mainNav");
    const menuButton = $("#menuButton");
    menuButton?.addEventListener("click", () => {
      const open = nav?.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(Boolean(open)));
    });
    $$("#mainNav a").forEach(link => link.addEventListener("click", () => {
      nav?.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
    }));
  }

  function applyMenuFilter(filter) {
    activeFilter = filter;
    const query = ($("#dishSearch")?.value || "").trim().toLowerCase();
    const sort = $("#dishSort")?.value || "featured";
    let visible = dishCards.filter(card => {
      const categoryMatch = filter === "All" || card.dataset.category === filter || card.dataset.badge === filter;
      const searchMatch = !query || card.dataset.search.toLowerCase().includes(query) || card.dataset.name.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });

    const sorted = [...visible];
    if (sort === "low") sorted.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    if (sort === "high") sorted.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    if (sort === "name") sorted.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));

    const grid = $("#dishGrid");
    sorted.forEach(card => grid?.appendChild(card));
    dishCards.forEach(card => card.hidden = !visible.includes(card));

    $$("[data-menu-filter]").forEach(button => button.classList.toggle("active", button.dataset.menuFilter === filter));
    const count = $("#menuCount");
    if (count) count.textContent = `${visible.length} ${visible.length === 1 ? "dish" : "dishes"}`;
    const empty = $("#menuEmpty");
    if (empty) empty.hidden = visible.length !== 0;
  }

  function initMenu() {
    $("#dishSearch")?.addEventListener("input", () => applyMenuFilter(activeFilter));
    $("#dishSort")?.addEventListener("change", () => applyMenuFilter(activeFilter));
    $$("[data-menu-filter]").forEach(button => button.addEventListener("click", () => applyMenuFilter(button.dataset.menuFilter)));
    $$("[data-category-jump]").forEach(button => button.addEventListener("click", () => {
      applyMenuFilter(button.dataset.categoryJump);
      $("#order")?.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth"});
    }));
    applyMenuFilter("All");
  }

  function updateModeButtons() {
    $$("[data-order-mode]").forEach(button => button.classList.toggle("active", button.dataset.orderMode === orderMode));
    const modeLabel = $("#orderModeLabel");
    if (modeLabel) modeLabel.textContent = orderMode;
    updateCart();
  }

  function setLocation(location, branch) {
    selectedLocation = location;
    selectedBranch = branch;
    ["#headerLocation","#heroLocation","#menuLocation"].forEach(selector => {
      const element = $(selector);
      if (element) element.textContent = location;
    });
    ["#heroBranch","#cartBranch"].forEach(selector => {
      const select = $(selector);
      if (select) select.value = branch;
    });
    safeCloseDialog($("#locationDialog"));
  }

  function initLocationAndModes() {
    $$("[data-order-mode]").forEach(button => button.addEventListener("click", () => {
      orderMode = button.dataset.orderMode;
      updateModeButtons();
    }));
    ["#locationButton","#heroLocationButton","#menuLocationButton"].forEach(selector => {
      $(selector)?.addEventListener("click", () => safeOpenDialog($("#locationDialog")));
    });
    $("#locationDialogClose")?.addEventListener("click", () => safeCloseDialog($("#locationDialog")));
    $("#locationDialog")?.addEventListener("click", event => {
      if (event.target === event.currentTarget) safeCloseDialog(event.currentTarget);
    });
    $$("[data-location-name]").forEach(button => button.addEventListener("click", () => {
      setLocation(button.dataset.locationName, button.dataset.branchName);
    }));
    $("#locationSearchInput")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      $$(".location-options button").forEach(button => {
        button.hidden = Boolean(query) && !button.textContent.toLowerCase().includes(query);
      });
    });
    $("#heroBranch")?.addEventListener("change", event => {
      selectedBranch = event.target.value;
      const cartBranch = $("#cartBranch");
      if (cartBranch) cartBranch.value = selectedBranch;
    });
    $("#cartBranch")?.addEventListener("change", event => {
      selectedBranch = event.target.value;
      const heroBranch = $("#heroBranch");
      if (heroBranch) heroBranch.value = selectedBranch;
    });
    updateModeButtons();
  }

  function addCartItem(dishId, options = {}) {
    const dish = dishes[dishId];
    if (!dish) return;
    const addOnPrice = Number(options.addOnPrice || 0);
    const key = options.custom ? `${dishId}-${Date.now()}-${Math.random()}` : dishId;
    const existing = cart.find(item => item.key === key);
    if (existing) existing.qty += Number(options.qty || 1);
    else cart.push({
      key,
      id:dishId,
      name:dish.name,
      price:dish.price + addOnPrice,
      basePrice:dish.price,
      qty:Number(options.qty || 1),
      image:dish.image,
      prep:options.prep || "Regular",
      addOns:options.addOns || "",
      note:options.note || ""
    });
    updateCart();
    openCart();
  }

  function cartNumbers() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const packaging = cart.length ? Math.min(45, 10 + cart.reduce((sum, item) => sum + item.qty, 0) * 4) : 0;
    const delivery = cart.length && orderMode === "Delivery" ? (subtotal >= 699 ? 0 : 49) : 0;
    const discount = Math.min(couponValue, subtotal);
    const total = Math.max(0, subtotal + packaging + delivery - discount);
    return {subtotal, packaging, delivery, discount, total};
  }

  function renderCartItems() {
    const container = $("#cartItems");
    if (!container) return;
    container.innerHTML = cart.map(item => `
      <article class="cart-line" data-cart-key="${item.key}">
        <div class="mini-photo"><img src="${item.image}" alt="${item.name}" onerror="this.hidden=true"></div>
        <div>
          <h3>${item.name}</h3>
          <p>${item.prep}${item.addOns ? ` · ${item.addOns}` : ""}${item.note ? ` · Note: ${item.note}` : ""}</p>
          <p>${money(item.price)} each*</p>
          <div class="qty"><button type="button" data-cart-minus="${item.key}">−</button><span>${item.qty}</span><button type="button" data-cart-plus="${item.key}">+</button></div>
        </div>
        <button class="remove-item" type="button" data-cart-remove="${item.key}" aria-label="Remove ${item.name}">×</button>
      </article>
    `).join("");

    $$("[data-cart-minus]", container).forEach(button => button.addEventListener("click", () => {
      const item = cart.find(entry => entry.key === button.dataset.cartMinus);
      if (!item) return;
      item.qty -= 1;
      if (item.qty <= 0) cart = cart.filter(entry => entry.key !== item.key);
      updateCart();
    }));
    $$("[data-cart-plus]", container).forEach(button => button.addEventListener("click", () => {
      const item = cart.find(entry => entry.key === button.dataset.cartPlus);
      if (!item) return;
      item.qty += 1;
      updateCart();
    }));
    $$("[data-cart-remove]", container).forEach(button => button.addEventListener("click", () => {
      cart = cart.filter(item => item.key !== button.dataset.cartRemove);
      updateCart();
    }));
  }

  function updateCart() {
    const quantity = cart.reduce((sum, item) => sum + item.qty, 0);
    ["#cartCount","#mobileCartCount"].forEach(selector => {
      const element = $(selector);
      if (element) element.textContent = quantity;
    });
    const empty = $("#cartEmpty");
    if (empty) empty.hidden = cart.length !== 0;
    const items = $("#cartItems");
    if (items) items.hidden = cart.length === 0;
    renderCartItems();

    const numbers = cartNumbers();
    const values = {
      "#itemSubtotal": money(numbers.subtotal),
      "#packagingCharge": money(numbers.packaging),
      "#deliveryCharge": numbers.delivery ? money(numbers.delivery) : (cart.length && orderMode === "Delivery" ? "FREE" : money(0)),
      "#couponDiscount": `− ${money(numbers.discount)}`,
      "#cartTotal": money(numbers.total)
    };
    Object.entries(values).forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.textContent = value;
    });
    const checkout = $("#checkoutButton");
    if (checkout) checkout.disabled = cart.length === 0;
  }

  function openCart() {
    $("#cartDrawer")?.classList.add("open");
    $("#cartDrawer")?.setAttribute("aria-hidden", "false");
    const backdrop = $("#drawerBackdrop");
    if (backdrop) backdrop.hidden = false;
    body.classList.add("locked");
  }

  function closeCart() {
    $("#cartDrawer")?.classList.remove("open");
    $("#cartDrawer")?.setAttribute("aria-hidden", "true");
    const backdrop = $("#drawerBackdrop");
    if (backdrop) backdrop.hidden = true;
    body.classList.remove("locked");
  }

  function initCart() {
    $("#cartButton")?.addEventListener("click", openCart);
    $("#mobileCartButton")?.addEventListener("click", openCart);
    $("#cartClose")?.addEventListener("click", closeCart);
    $("#drawerBackdrop")?.addEventListener("click", closeCart);
    $("#emptyMenuLink")?.addEventListener("click", closeCart);

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-add-dish]");
      if (!button) return;
      addCartItem(button.dataset.addDish);
    });

    $("#applyCoupon")?.addEventListener("click", () => {
      const code = ($("#couponInput")?.value || "").trim().toUpperCase();
      const message = $("#couponMessage");
      if (code === "MEROZA100" && cart.length) {
        couponValue = 100;
        if (message) message.textContent = "Demo coupon applied: ₹100 off*";
      } else {
        couponValue = 0;
        if (message) message.textContent = code ? "Demo code not valid for this cart." : "Enter a demo coupon.";
      }
      updateCart();
    });

    $("#checkoutButton")?.addEventListener("click", () => {
      if (!cart.length) return;
      const numbers = cartNumbers();
      const lines = cart.map(item => `${item.name} × ${item.qty} = ${money(item.price * item.qty)}${item.addOns ? ` (${item.addOns})` : ""}`);
      const message = [
        "Hello Ajay, I am testing the rebuilt Meroza Kitchen food website.",
        "",
        `Mode: ${orderMode}`,
        `Location: ${selectedLocation}`,
        `Branch: ${selectedBranch}`,
        "",
        "Demo cart:",
        ...lines,
        `Item subtotal: ${money(numbers.subtotal)}`,
        `Packaging demo: ${money(numbers.packaging)}`,
        `Delivery demo: ${money(numbers.delivery)}`,
        `Coupon discount: ${money(numbers.discount)}`,
        `Demo total: ${money(numbers.total)}`,
        "",
        "No real food order is requested. I want information about a restaurant ordering website."
      ].join("\n");
      window.open(`https://wa.me/919929562585?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    });

    $$("[data-offer-add]").forEach(button => button.addEventListener("click", () => {
      const offer = button.dataset.offerAdd;
      if (offer === "family") ["d1","d2","d4","d9"].forEach(id => {
        const existing = cart.find(item => item.key === id);
        if (existing) existing.qty += 1;
        else addCartItem(id, {qty:1});
      });
      if (offer === "pickup") {
        orderMode = "Pickup";
        ["d3","d6"].forEach(id => addCartItem(id));
      }
      if (offer === "sweet") ["d9","d10"].forEach(id => addCartItem(id));
      updateModeButtons();
      updateCart();
      openCart();
    }));

    updateCart();
  }

  function initDishDialog() {
    const dialog = $("#dishDialog");
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-view-dish]");
      if (!button) return;
      currentDish = dishes[button.dataset.viewDish];
      if (!currentDish) return;
      $("#dialogDishName").textContent = currentDish.name;
      $("#dialogDishCategory").textContent = currentDish.category;
      $("#dialogDishPrice").textContent = `${money(currentDish.price)}*`;
      $("#dialogDishDescription").textContent = currentDish.description;
      $("#dialogPhoto").style.backgroundImage = `linear-gradient(180deg,transparent,rgba(25,8,5,.15)),url("${currentDish.image}")`;
      $$('input[name="prep"]', dialog).forEach((input, index) => input.checked = index === 0);
      $$('input[type="checkbox"]', dialog).forEach(input => input.checked = false);
      $("#dishNote").value = "";
      safeOpenDialog(dialog);
    });
    $("#dishDialogClose")?.addEventListener("click", () => safeCloseDialog(dialog));
    dialog?.addEventListener("click", event => event.target === dialog && safeCloseDialog(dialog));
    $("#dialogAddButton")?.addEventListener("click", () => {
      if (!currentDish) return;
      const prep = $('input[name="prep"]:checked', dialog)?.value || "Regular";
      const checked = $$('input[type="checkbox"]:checked', dialog);
      let addOnPrice = 0;
      const addOns = checked.map(input => {
        const [name, price] = input.value.split("|");
        addOnPrice += Number(price || 0);
        return name;
      }).join(", ");
      const note = ($("#dishNote")?.value || "").trim();
      safeCloseDialog(dialog);
      addCartItem(currentDish.id, {custom:true, prep, addOns, addOnPrice, note});
    });
  }

  function openBooking(type) {
    const isTable = type === "Table Booking";
    $("#bookingType").value = type;
    $("#formVisualKicker").textContent = isTable ? "DINE-IN · DEMO" : "CATERING · DEMO";
    $("#formVisualTitle").textContent = isTable ? "Plan your table." : "Plan the occasion.";
    $("#formVisualText").textContent = isTable
      ? "Capture branch, date, time, guests and occasion in one clean flow."
      : "Capture event date, guest count, venue and food requirements.";
    $("#bookingKicker").textContent = isTable ? "TABLE BOOKING · DEMO" : "CATERING ENQUIRY · DEMO";
    $("#bookingTitle").textContent = isTable ? "Book a table" : "Plan catering";
    const branchSelect = $('#bookingForm select[name="branch"]');
    if (branchSelect) branchSelect.value = selectedBranch;
    safeOpenDialog($("#formDialog"));
  }

  function validateField(input) {
    let message = "";
    if (input.required && !input.value.trim()) message = "This field is required.";
    if (input.name === "phone" && input.value.trim() && !/^[0-9+\s()-]{8,18}$/.test(input.value.trim())) message = "Enter a valid phone number.";
    input.setAttribute("aria-invalid", String(Boolean(message)));
    const error = input.closest("label")?.querySelector(".error");
    if (error) error.textContent = message;
    return !message;
  }

  function validateForm(form) {
    const fields = $$("[required]", form);
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) fields.find(field => field.getAttribute("aria-invalid") === "true")?.focus();
    return valid;
  }

  function initForms() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];
    const bookingDate = $('#bookingForm input[name="date"]');
    if (bookingDate) {
      bookingDate.min = minDate;
      bookingDate.value = minDate;
    }

    $$("[data-open-table]").forEach(button => button.addEventListener("click", () => openBooking("Table Booking")));
    $$("[data-open-catering]").forEach(button => button.addEventListener("click", () => openBooking("Catering Enquiry")));
    $("#formDialogClose")?.addEventListener("click", () => safeCloseDialog($("#formDialog")));
    $("#formDialog")?.addEventListener("click", event => event.target === event.currentTarget && safeCloseDialog(event.currentTarget));

    $("#bookingForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const data = new FormData(form);
      const message = [
        "Hello Ajay, I am viewing the rebuilt Meroza Kitchen demo.",
        "",
        `${data.get("type")} enquiry:`,
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        `Date: ${data.get("date")}`,
        `Time: ${data.get("time")}`,
        `Guests: ${data.get("guests")}`,
        `Branch: ${data.get("branch")}`,
        `Requirement: ${data.get("message") || ""}`,
        "",
        "This is a website enquiry, not a real restaurant booking."
      ].join("\n");
      window.open(`https://wa.me/919929562585?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    });

    $("#projectForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const data = new FormData(form);
      const message = [
        "Hello Ajay, I want a food website price.",
        "",
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        `Restaurant / Brand: ${data.get("business") || ""}`,
        `Website type: ${data.get("type")}`,
        `Requirement: ${data.get("message") || ""}`,
        "",
        "Reference: Rebuilt Meroza Kitchen Demo"
      ].join("\n");
      window.open(`https://wa.me/919929562585?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    });
  }

  function initSimpleDialog() {
    const content = {
      loyalty:{
        kicker:"LOYALTY PROGRAMME · DEMO",
        title:"Bring customers back.",
        text:"A client version can connect customer login, points, rewards, birthdays, favourites and order history.",
        message:"Hello Ajay, I want loyalty, rewards and reorder features for a food-ordering website."
      },
      tracking:{
        kicker:"ORDER TRACKING · DEMO",
        title:"Explain every order state.",
        text:"A client version can connect preparation, dispatch, delivery-partner details, ETA and support.",
        message:"Hello Ajay, I want an order-tracking feature for a restaurant website."
      }
    };
    $$("[data-open-simple]").forEach(button => button.addEventListener("click", () => {
      const data = content[button.dataset.openSimple];
      if (!data) return;
      $("#simpleKicker").textContent = data.kicker;
      $("#simpleTitle").textContent = data.title;
      $("#simpleText").textContent = data.text;
      $("#simpleLink").href = `https://wa.me/919929562585?text=${encodeURIComponent(data.message)}`;
      safeOpenDialog($("#simpleDialog"));
    }));
    $("#simpleDialogClose")?.addEventListener("click", () => safeCloseDialog($("#simpleDialog")));
    $("#simpleDialog")?.addEventListener("click", event => event.target === event.currentTarget && safeCloseDialog(event.currentTarget));
  }

  function initBranchesAndFaq() {
    $("#branchSearch")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      $$("[data-branch-search]").forEach(card => {
        card.hidden = Boolean(query) && !card.dataset.branchSearch.includes(query) && !card.textContent.toLowerCase().includes(query);
      });
    });
    $$("[data-select-branch]").forEach(button => button.addEventListener("click", () => {
      const branch = button.dataset.selectBranch;
      selectedBranch = branch;
      $("#heroBranch").value = branch;
      $("#cartBranch").value = branch;
      const city = branch.replace("Meroza ", "");
      setLocation(city === "Shimla" ? "New Shimla" : city, branch);
      $("#order")?.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth"});
    }));
    $$(".faq-list button").forEach(button => button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      $$(".faq-list button").forEach(item => item.setAttribute("aria-expanded", "false"));
      button.setAttribute("aria-expanded", String(!open));
    }));
  }

  function init() {
    initCustomizer();
    initNavigation();
    initMenu();
    initLocationAndModes();
    initCart();
    initDishDialog();
    initForms();
    initSimpleDialog();
    initBranchesAndFaq();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();