import { API_CONFIG } from "./config.js";

const QUOTE_API_URL = "https://dummyjson.com/quotes/random";

export async function fetchRandomQuote() {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_CONFIG.timeoutMs,
  );

  try {
    const response = await fetch(QUOTE_API_URL, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Quote request failed with status ${response.status}.`);
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.quote !== "string" ||
      typeof data.author !== "string" ||
      data.quote.trim() === "" ||
      data.author.trim() === ""
    ) {
      throw new Error("The quote API returned invalid data.");
    }

    return {
      quote: data.quote.trim(),
      author: data.author.trim(),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The quote request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function initializeQuoteSection() {
  const quoteText = document.getElementById("quoteText");

  const quoteAuthor = document.getElementById("quoteAuthor");

  const newQuoteBtn = document.getElementById("newQuoteBtn");

  const quoteError = document.getElementById("quoteError");

  if (!quoteText || !quoteAuthor || !newQuoteBtn || !quoteError) {
    return;
  }

  async function loadRandomQuote() {
    quoteError.hidden = true;
    newQuoteBtn.disabled = true;

    quoteText.textContent = "Loading quote...";
    quoteAuthor.textContent = "";

    try {
      const { quote, author } = await fetchRandomQuote();

      quoteText.textContent = `“${quote}”`;
      quoteAuthor.textContent = `— ${author}`;
    } catch (error) {
      console.error("Unable to load quote:", error);

      quoteText.textContent = "";
      quoteAuthor.textContent = "";

      quoteError.textContent = "Unable to load a quote.";

      quoteError.hidden = false;
    } finally {
      newQuoteBtn.disabled = false;
    }
  }

  newQuoteBtn.addEventListener("click", loadRandomQuote);

  loadRandomQuote();
}

initializeQuoteSection();
