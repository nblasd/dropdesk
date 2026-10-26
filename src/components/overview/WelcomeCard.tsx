import { ArrowUpRight, Package, ShoppingBag, Sparkles } from "lucide-react";

function WelcomeArt() {
  return (
    <div className="welcome-art">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-card art-card-back">
        <span className="art-mini-icon mint">
          <Package size={14} />
        </span>
        <span className="art-lines">
          <i />
          <i />
        </span>
        <span className="art-check">✓</span>
      </div>
      <div className="art-card art-card-front">
        <span className="art-mini-icon peach">
          <ShoppingBag size={14} />
        </span>
        <span className="art-lines">
          <i />
          <i />
        </span>
      </div>
      <div className="art-spark">✳</div>
      <div className="art-dot" />
    </div>
  );
}

export function WelcomeCard({
  hasClients,
  onOpenOrders,
  onAddClient,
}: {
  hasClients: boolean;
  onOpenOrders: () => void;
  onAddClient: () => void;
}) {
  if (!hasClients) {
    return (
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <Sparkles size={14} /> YOUR WORKSPACE IS READY
          </span>
          <h2>No client workspaces yet.</h2>
          <p>Create your first client to start tracking product ideas, listings, and orders.</p>
          <button onClick={onAddClient}>
            Add your first client <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="welcome-card">
      <div className="welcome-copy">
        <span className="welcome-kicker">
          <Sparkles size={14} /> YOUR BUSINESS, AT A GLANCE
        </span>
        <h2>Everything in its right place.</h2>
        <p>Your clients, products, listings, and orders—all together, finally.</p>
        <button onClick={onOpenOrders}>
          View your orders <ArrowUpRight size={14} />
        </button>
      </div>
      <WelcomeArt />
    </section>
  );
}
