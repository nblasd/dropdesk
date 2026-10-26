import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUpRight,
  ClipboardList,
  FileSpreadsheet,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Theme } from "@/lib/types";
import { ThemePicker } from "@/components/ui/ThemePicker";

type LandingPageProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onStart: () => void;
  onLogin: () => void;
  onPreview: () => void;
};

export function LandingPage({ theme, onThemeChange, onStart, onLogin, onPreview }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top">
          <span className="brand-mark">
            <ArrowLeftRight size={19} strokeWidth={2.4} />
          </span>
          <span>
            dropdesk<span className="brand-dot">.</span>
          </span>
        </a>
        <nav>
          <a href="#features">Features</a>
          <a href="#workflow">How it works</a>
        </nav>
        <div className="landing-nav-actions">
          <ThemePicker theme={theme} onChange={onThemeChange} />
          <button className="landing-login" onClick={onLogin}>
            Log in
          </button>
          <button className="landing-button landing-button-dark" onClick={onStart}>
            Get started free <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-pill">
            <span /> THE WORKSPACE FOR DROPSHIP OPERATIONS
          </div>
          <h1>
            Every client.
            <br />
            Every moving part.
            <br />
            <em>One clear workspace.</em>
          </h1>
          <p>Keep product research, marketplace listings, and order profits organized across every client you manage.</p>
          <div className="landing-hero-actions">
            <button className="landing-button landing-button-dark" onClick={onStart}>
              Create your free workspace <ArrowUpRight size={16} />
            </button>
            <button className="landing-text-link landing-demo-link" onClick={onPreview}>
              Explore the demo workspace <ArrowUpRight size={14} />
            </button>
            <a href="#features" className="landing-text-link">
              See what you can organize <ArrowDown size={15} />
            </a>
          </div>
          <div className="landing-trust">
            <span className="trust-avatars">
              <i>R</i>
              <i>M</i>
              <i>A</i>
            </span>
            <span>Built for independent dropshippers and virtual assistants</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="Illustration of an organized dropshipping workspace">
          <div className="visual-glow" />
          <div className="visual-window">
            <div className="visual-top">
              <div className="visual-dots">
                <i />
                <i />
                <i />
              </div>
              <span>YOUR WORKSPACE</span>
              <span className="visual-menu">•••</span>
            </div>
            <div className="visual-title">
              <div>
                <small>CLIENT PORTFOLIO</small>
                <b>All your work, in one place</b>
              </div>
              <span className="visual-add">+</span>
            </div>
            <div className="visual-metrics">
              <div>
                <span>CLIENTS</span>
                <b>
                  <i /> Organized
                </b>
              </div>
              <div>
                <span>PRODUCT IDEAS</span>
                <b>
                  <i /> Track costs
                </b>
              </div>
              <div>
                <span>ORDERS</span>
                <b>
                  <i /> See profit
                </b>
              </div>
            </div>
            <div className="visual-section-head">
              <b>Workspace tools</b>
              <span>Ready when you are</span>
            </div>
            <div className="visual-tool">
              <span className="visual-tool-icon icon-sage">
                <Package size={16} />
              </span>
              <span>
                <b>Product hunting</b>
                <small>Compare source cost and target price</small>
              </span>
              <ArrowUpRight size={14} />
            </div>
            <div className="visual-tool">
              <span className="visual-tool-icon icon-peach">
                <ClipboardList size={16} />
              </span>
              <span>
                <b>Marketplace listings</b>
                <small>Keep titles, links, and status together</small>
              </span>
              <ArrowUpRight size={14} />
            </div>
            <div className="visual-tool">
              <span className="visual-tool-icon icon-lilac">
                <ShoppingBag size={16} />
              </span>
              <span>
                <b>Orders &amp; profit</b>
                <small>Follow fulfillment and calculate margins</small>
              </span>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <div className="visual-note">
            <span>
              <TrendingUp size={15} />
            </span>
            <div>
              <b>Know where every order stands</b>
              <small>One view for every client account</small>
            </div>
          </div>
          <div className="visual-sparkle sparkle-a">✳</div>
          <div className="visual-sparkle sparkle-b">✦</div>
        </div>
      </section>

      <section className="landing-proof">
        <span>MADE TO KEEP THE DETAILS TOGETHER</span>
        <div>
          <b>
            <Users size={16} /> CLIENT WORKSPACES
          </b>
          <b>
            <Package size={16} /> PRODUCT RESEARCH
          </b>
          <b>
            <Store size={16} /> MARKETPLACE LISTINGS
          </b>
          <b>
            <TrendingUp size={16} /> ORDER PROFIT
          </b>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-intro">
          <span className="landing-eyebrow">LESS SPREADSHEET SHUFFLING</span>
          <h2>
            All the important details,
            <br />
            <em>right where you need them.</em>
          </h2>
          <p>Dropdesk gives each client a tidy home for the work you do every day.</p>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-icon sage">
              <Users size={19} />
            </span>
            <small>01 / CLIENTS</small>
            <h3>One workspace per client</h3>
            <p>Keep each store’s research, listings, and orders grouped together as your client list grows.</p>
          </article>
          <article>
            <span className="feature-icon peach">
              <Package size={19} />
            </span>
            <small>02 / PRODUCTS</small>
            <h3>Research with the numbers</h3>
            <p>Save source links, listing details, costs, and target prices in a table made for product hunting.</p>
          </article>
          <article>
            <span className="feature-icon lilac">
              <ShoppingBag size={19} />
            </span>
            <small>03 / OPERATIONS</small>
            <h3>Follow listings to orders</h3>
            <p>Track marketplace listings and fulfillment, then see order profit calculated from your figures.</p>
          </article>
          <article>
            <span className="feature-icon gold">
              <FileSpreadsheet size={19} />
            </span>
            <small>04 / YOUR DATA</small>
            <h3>Take your work with you</h3>
            <p>Export your tables to CSV whenever you need a spreadsheet copy of your records.</p>
          </article>
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div>
          <span className="landing-eyebrow">A SIMPLE WAY TO STAY ON TOP OF IT</span>
          <h2>
            From first idea
            <br />
            to fulfilled order.
          </h2>
          <p>Set up a client once, then keep the day-to-day work moving in a shared, organized flow.</p>
          <button className="landing-button landing-button-light" onClick={onStart}>
            Start organizing for free <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="workflow-steps">
          <div>
            <span>01</span>
            <div>
              <b>Create a client workspace</b>
              <small>Give each client and store a place of its own.</small>
            </div>
            <Users size={18} />
          </div>
          <div>
            <span>02</span>
            <div>
              <b>Add product and listing details</b>
              <small>Keep supplier links, prices, and statuses together.</small>
            </div>
            <ClipboardList size={18} />
          </div>
          <div>
            <span>03</span>
            <div>
              <b>Track orders and profit</b>
              <small>Record costs and sale prices as orders come in.</small>
            </div>
            <TrendingUp size={18} />
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <span className="landing-eyebrow">YOUR WORKSPACE IS READY WHEN YOU ARE</span>
          <h2>Spend less time finding things.</h2>
          <p>Bring your client operations together in Dropdesk.</p>
        </div>
        <button className="landing-button landing-button-dark" onClick={onStart}>
          Create a free account <ArrowUpRight size={16} />
        </button>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <span className="brand-mark">
            <ArrowLeftRight size={17} strokeWidth={2.4} />
          </span>
          <span>
            dropdesk<span className="brand-dot">.</span>
          </span>
        </a>
        <span>One calm workspace for the moving parts.</span>
        <span>© 2026 Dropdesk</span>
      </footer>
    </div>
  );
}
