const QUOTE_API_URL =
    "https://dummyjson.com/quotes/random";

/**
 * يجلب اقتباسًا عشوائيًا من DummyJSON.
 *
 * @returns {Promise<{ quote: string, author: string }>}
 */
export async function fetchRandomQuote() {
    const response = await fetch(QUOTE_API_URL, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(
            `Quote request failed with status ${response.status}.`
        );
    }

    const data = await response.json();

    if (
        !data ||
        typeof data.quote !== "string" ||
        typeof data.author !== "string"
    ) {
        throw new Error(
            "The quote API returned invalid data."
        );
    }

    return {
        quote: data.quote.trim(),
        author: data.author.trim()
    };
}

/**
 * يربط قسم الاقتباس الموجود في الصفحة مع الـAPI.
 */
function initializeQuoteSection() {
    const quoteText =
        document.getElementById("quoteText");

    const quoteAuthor =
        document.getElementById("quoteAuthor");

    const newQuoteBtn =
        document.getElementById("newQuoteBtn");

    const quoteError =
        document.getElementById("quoteError");

    /*
     * يمنع حدوث خطأ إذا تم تحميل الملف
     * في صفحة لا تحتوي قسم الاقتباس.
     */
    if (
        !quoteText ||
        !quoteAuthor ||
        !newQuoteBtn ||
        !quoteError
    ) {
        return;
    }

    async function loadRandomQuote() {
        quoteError.hidden = true;
        newQuoteBtn.disabled = true;

        quoteText.textContent = "Loading quote...";
        quoteAuthor.textContent = "";

        try {
            const { quote, author } =
                await fetchRandomQuote();

            quoteText.textContent = `“${quote}”`;
            quoteAuthor.textContent = `— ${author}`;
        } catch (error) {
            console.error(
                "Unable to load quote:",
                error
            );

            quoteText.textContent = "";
            quoteAuthor.textContent = "";

            quoteError.textContent =
                "Unable to load a quote.";

            quoteError.hidden = false;
        } finally {
            newQuoteBtn.disabled = false;
        }
    }

    newQuoteBtn.addEventListener(
        "click",
        loadRandomQuote
    );

    loadRandomQuote();
}

initializeQuoteSection();