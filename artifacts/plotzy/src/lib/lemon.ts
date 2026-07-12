// Lemon Squeezy checkout helpers, shared by the Pro subscription page
// and the donation card. lemon.js renders the checkout as an overlay
// on top of the current page (with Apple Pay / Google Pay / cards /
// PayPal inside, depending on the buyer's device); if the script fails
// to load we fall back to opening the checkout URL in a new tab.

let lemonJsLoading: Promise<void> | null = null;
export function ensureLemonJs(): Promise<void> {
  if ((window as any).LemonSqueezy) return Promise.resolve();
  if (!lemonJsLoading) {
    lemonJsLoading = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = "https://assets.lemonsqueezy.com/lemon.js";
      el.defer = true;
      el.onload = () => {
        try { (window as any).createLemonSqueezy?.(); } catch { /* older lemon.js self-initializes */ }
        resolve();
      };
      el.onerror = () => reject(new Error("lemon.js failed"));
      document.head.appendChild(el);
    });
  }
  return lemonJsLoading;
}

export async function openLemonCheckout(url: string) {
  try {
    await ensureLemonJs();
    const LS = (window as any).LemonSqueezy;
    if (LS?.Url?.Open) { LS.Url.Open(url); return; }
  } catch { /* fall through to a plain tab */ }
  window.open(url, "_blank", "noopener");
}
