# Talad Nod (ตลาดนัด)

A market order system for Thai weekend/community markets (ตลาดนัด). Customers pre-order from vendors, and vendors key in walk-in orders at their booth on market day.

## Language

**Vendor**:
A market seller who manages one or more booths and uses the system to accept both pre-orders and walk-in orders.
_Avoid_: Seller, merchant, shop owner

**Walk-in Order**:
An order created by a vendor on behalf of a customer who visits the booth in person, as opposed to a pre-order submitted via the customer-facing app.
_Avoid_: Offline order, counter order, spot order

**Customer Name**:
An optional free-text label for a walk-in customer, stored as a `"Walk-in: <name>"` prefix in the order's customer note. Not linked to a registered user account.
_Avoid_: Customer ID, walk-in ID

**Booth**:
A vendor's physical stall within a market. A vendor may own multiple booths, but keys orders from one at a time.
_Avoid_: Stall, shop, stand

**Default Booth**:
The booth pre-set in a vendor's profile, used as the automatic target for walk-in order key-in without requiring re-selection each time.

**Product Catalog**:
The vendor's pre-registered list of products, each with a name, price, and unit. The catalog is the primary source for order entry; free-text entries are for one-off items not yet in the catalog.
_Avoid_: Inventory, stock list, menu

**Quick Product**:
A free-text product entry created on the fly during order key-in for items not found in the Product Catalog. May optionally be saved to the catalog for reuse.
_Avoid_: Custom item, ad-hoc product

**Discount**:
A whole-baht amount subtracted from the order total before finalization. Applied by the vendor at walk-in order creation time.
_Avoid_: Reduction, markdown

**Hold-to-Confirm**:
A submission guard requiring the vendor to sustain pressure on the confirm button for a brief moment before the order is created. Prevents accidental submissions without a modal dialog.
_Avoid_: Long-press, press-and-hold

**Split-Screen Layout**:
The mobile view dividing the screen between a product grid (top) and a collapsible cart drawer (bottom). The cart drawer can be resized via a drag handle to show more items or more products.
_Avoid_: Split view, dual panel
