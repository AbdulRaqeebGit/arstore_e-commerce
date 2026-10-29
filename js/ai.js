
/* =========================================================
   ARstore AI Assistant
   Gemini AI + Local Product Search + Offline Fallback
   ========================================================= */

window.App = window.App || {};

App.AI = (function () {
  "use strict";

  const U = App.Utils;
  const S = App.Store;

  const CATEGORIES = [
    "Electronics",
    "Clothing",
    "Home",
    "Accessories",
    "Sports",
    "Beauty",
    "Food",
    "Other",
  ];

  // -------------------------------------------------------
  // Configuration
  // -------------------------------------------------------

  function geminiKey() {
    return App.CONFIG?.gemini?.key || "";
  }

  function geminiModel() {
    return App.CONFIG?.gemini?.model || "gemini-2.5-flash";
  }

  // -------------------------------------------------------
  // Local product matching (works without Gemini)
  // -------------------------------------------------------

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function scoreProduct(query, product) {
    const queryWords = new Set(tokenize(query));

    const productText = tokenize([
      product.title,
      product.description,
      product.category,
      product.sellerName,
    ].filter(Boolean).join(" "));

    let score = 0;
    const hits = new Set();

    if (!queryWords.size) {
      return { product, score: 0, hits: [] };
    }

    productText.forEach((word) => {
      if (queryWords.has(word)) {
        score += 1;
        hits.add(word);
      }
    });

    // Partial word matching
    queryWords.forEach((queryWord) => {
      if (queryWord.length < 3) return;

      productText.forEach((word) => {
        if (
          word.length >= 3 &&
          word !== queryWord &&
          (word.includes(queryWord) ||
            queryWord.includes(word))
        ) {
          score += 0.5;
          hits.add(queryWord);
        }
      });
    });

    // Category boost
    if (
      product.category &&
      String(query).toLowerCase().includes(
        String(product.category).toLowerCase()
      )
    ) {
      score += 2;
    }

    return {
      product,
      score: score + hits.size,
      hits: Array.from(hits),
    };
  }

  function localMatch(query, products, minScore = 0.5) {
    return (products || [])
      .map((product) => scoreProduct(query, product))
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  function money(price) {
    try {
      if (U && typeof U.money === "function") {
        return U.money(price);
      }
    } catch (error) {
      console.warn("Price formatting failed:", error);
    }

    return "Rs. " + Number(price || 0).toLocaleString("en-PK");
  }

  function localAnswer(query, products) {
    const matches = localMatch(query, products, 0.5).slice(0, 4);

    if (!matches.length) {
      return (
        'I could not find a matching product for "' +
        query +
        '". Try searching for earbuds, watch, phone, kurta or candle.'
      );
    }

    const lines = matches.map(({ product }) => {
      return (
        "- " +
        (product.title || "Product") +
        " — " +
        money(product.price) +
        " (" +
        (product.category || "Other") +
        ")"
      );
    });

    return (
      'Products matching "' +
      query +
      '":\n' +
      lines.join("\n") +
      "\nOpen the product card to view its details."
    );
  }

  // -------------------------------------------------------
  // Gemini API
  // -------------------------------------------------------

  async function callGemini(prompt, imageDataUrl) {
    const key = geminiKey();

    if (!key) {
      throw new Error("Gemini API key is missing in App.CONFIG.");
    }

    const model = geminiModel();

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent";

    const parts = [{ text: String(prompt || "") }];

    // Optional image input
    if (imageDataUrl) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/
        .exec(imageDataUrl);

      if (!match) {
        throw new Error(
          "Invalid image data. Please upload a supported image."
        );
      }

      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2].replace(/\s/g, ""),
        },
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Gemini returned an invalid response. HTTP " + response.status
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        "Gemini request failed with HTTP " + response.status;

      console.error("Gemini API error:", {
        status: response.status,
        message,
      });

      throw new Error(message);
    }

    const candidate = data?.candidates?.[0];

    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Gemini blocked this request for safety reasons.");
    }

    const result = (candidate?.content?.parts || [])
      .map((part) => part.text || "")
      .join("")
      .trim();

    if (!result) {
      throw new Error(
        "Gemini returned no text. Check the model response and API limits."
      );
    }

    return result;
  }

  // -------------------------------------------------------
  // Customer assistant
  // -------------------------------------------------------

  async function askAssistant(query, imageDataUrl) {
    const products = S.getProducts() || [];

    if (!query && !imageDataUrl) {
      return "Ask me about a product or upload a product photo.";
    }

    let label = String(query || "").trim();

    // Use Gemini to understand an uploaded photo
    if (imageDataUrl) {
      try {
        const description = await callGemini(
          "Identify the visible product in this image. " +
          "Return a short description with its product type, " +
          "colour and useful search keywords. Do not guess its brand.",
          imageDataUrl
        );

        label = [label, description].filter(Boolean).join(" ");
      } catch (error) {
        console.warn(
          "Gemini image identification unavailable:",
          error.message
        );
      }

      // Try local visual colour matching
      try {
        if (
          U &&
          typeof U.loadImage === "function" &&
          typeof U.extractPalette === "function" &&
          typeof U.paletteDistance === "function"
        ) {
          const image = await U.loadImage(imageDataUrl);
          const palette = U.extractPalette(image, 24, 4);

          const ranked = products
            .filter((product) => product.palette)
            .map((product) => ({
              product,
              distance: U.paletteDistance(
                palette,
                product.palette
              ),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 4);

          if (ranked.length) {
            return (
              "Products with similar colours:\n" +
              ranked.map(({ product }) =>
                "- " +
                (product.title || "Product") +
                " — " +
                money(product.price)
              ).join("\n") +
              "\nThese are colour-based matches, not guaranteed exact matches."
            );
          }
        }
      } catch (error) {
        console.warn("Local image matching unavailable:", error.message);
      }

      if (label) {
        return localAnswer(label, products);
      }

      return (
        "I could not identify the image automatically. " +
        "Please add a few words describing the product."
      );
    }

    // Try Gemini for the customer's question
    try {
      const productContext = products
        .slice(0, 40)
        .map((product) => ({
          title: product.title || "",
          price: product.price ?? null,
          category: product.category || "",
          description: String(product.description || "").slice(0, 160),
        }));

      const prompt =
        "You are the customer assistant for ARstore, an online marketplace.\n" +
        "Answer the user's question clearly and briefly.\n" +
        "Use only the supplied product data for store availability and prices.\n" +
        "Do not invent products, stock, discounts or delivery promises.\n" +
        "If no matching product is present, say so honestly.\n\n" +
        "Store products:\n" +
        JSON.stringify(productContext) +
        "\n\nCustomer question:\n" +
        label;

      return await callGemini(prompt);
    } catch (error) {
      console.warn(
        "Gemini customer assistant unavailable; using local search:",
        error.message
      );

      return localAnswer(label, products);
    }
  }

  // -------------------------------------------------------
  // Seller assistant: product listing generator
  // -------------------------------------------------------

  function fallbackListing(title, description) {
    const cleanTitle = String(title || "Premium Product").trim();
    const cleanDescription = String(description || "").trim();

    return {
      title: cleanTitle
        ? cleanTitle.charAt(0).toUpperCase() +
          cleanTitle.slice(1)
        : "Premium Product",

      description: cleanDescription ||
        "Discover this product on ARstore. Check its details, " +
        "price and availability before placing your order.",

      hashtags: "#ARstore #Pakistan #Shopping #Quality",
    };
  }

  async function sellerAesthetic(title, description, imageDataUrl) {
    const fallback = () => fallbackListing(title, description);

    try {
      const prompt =
        "You write accurate and appealing e-commerce product listings.\n" +
        "Create a short product title of no more than 8 words, " +
        "a persuasive description of 1-2 sentences, and 4 relevant hashtags.\n" +
        "Use the supplied product information. Do not invent specifications, " +
        "brands, certifications or performance claims.\n" +
        "Return ONLY valid JSON in this format:\n" +
        '{"title":"...","description":"...","hashtags":"..."}\n\n' +
        "Product title: " + String(title || "Product") + "\n" +
        "Existing description: " + String(description || "Not provided");

      const response = await callGemini(prompt, imageDataUrl || undefined);

      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Gemini did not return valid JSON.");
      }

      const result = JSON.parse(jsonMatch[0]);

      if (
        !result ||
        typeof result.title !== "string" ||
        !result.title.trim() ||
        typeof result.description !== "string" ||
        typeof result.hashtags !== "string"
      ) {
        throw new Error("Gemini returned an incomplete listing.");
      }

      return {
        title: result.title.trim(),
        description: result.description.trim(),
        hashtags: result.hashtags.trim(),
      };
    } catch (error) {
      console.error(
        "Seller AI generation failed; using fallback:",
        error.message
      );

      return fallback();
    }
  }

  // -------------------------------------------------------
  // Public methods used by the rest of ARstore
  // -------------------------------------------------------

  return {
    askAssistant,
    sellerAesthetic,
    localMatch,
    localAnswer,
    callGemini,
    CATEGORIES,
  };
})();
