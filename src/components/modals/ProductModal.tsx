import { Package, Plus, TrendingUp } from "lucide-react";

export function ProductModal({
  name,
  setName,
  sourceUrl,
  setSourceUrl,
  ebayUrl,
  setEbayUrl,
  source,
  setSource,
  cost,
  setCost,
  price,
  setPrice,
  onAdd,
}: {
  name: string;
  setName: (value: string) => void;
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
  ebayUrl: string;
  setEbayUrl: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  cost: string;
  setCost: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <span className="modal-icon mint">
        <Package size={19} />
      </span>
      <h2>Add product idea</h2>
      <p>Save the supplier details and target eBay price for this product.</p>

      <label htmlFor="product-name">PRODUCT NAME</label>
      <input id="product-name" autoFocus className="modal-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stainless steel water bottle" required />

      <label htmlFor="product-source-link">SUPPLIER LINK</label>
      <input id="product-source-link" type="url" className="modal-input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." required />

      <label htmlFor="product-ebay-link">
        EBAY LINK <span className="required-mark">required</span>
      </label>
      <input
        id="product-ebay-link"
        type="url"
        className="modal-input"
        value={ebayUrl}
        onChange={(e) => setEbayUrl(e.target.value)}
        placeholder="https://www.ebay.com/itm/..."
        required
      />

      <label htmlFor="product-source">SOURCE</label>
      <select id="product-source" className="modal-input" value={source} onChange={(e) => setSource(e.target.value)}>
        <option>AliExpress</option>
        <option>Alibaba</option>
        <option>Amazon</option>
        <option>Other</option>
      </select>

      <div className="product-price-fields">
        <div>
          <label htmlFor="supplier-cost">SUPPLIER COST</label>
          <input id="supplier-cost" type="number" min="0" step="0.01" className="modal-input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <label htmlFor="ebay-price">EBAY PRICE</label>
          <input id="ebay-price" type="number" min="0" step="0.01" className="modal-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
        </div>
      </div>

      <div className="modal-note">
        <TrendingUp size={15} /> Estimated profit is calculated after you add the product.
      </div>
      <button className="button primary modal-submit" type="submit">
        <Plus size={16} /> Add product
      </button>
    </form>
  );
}
